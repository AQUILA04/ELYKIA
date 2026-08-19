package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.ReconciliationDto;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.entity.inventory.InventoryReconciliation;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.ReconciliationAction;
import com.optimize.elykia.core.repository.InventoryItemRepository;
import com.optimize.elykia.core.repository.InventoryReconciliationRepository;
import com.optimize.elykia.core.repository.StockMovementRepository;
import com.optimize.elykia.core.service.stock.StockMovementService;
import com.optimize.elykia.core.service.store.ArticleHistoryService;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.store.InventoryReconciliationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryReconciliationServiceTest {

    private static final Long INVENTORY_ITEM_ID = 14L;
    private static final String USERNAME = "inventory.manager";

    @Mock
    private InventoryReconciliationRepository reconciliationRepository;
    @Mock
    private InventoryItemRepository inventoryItemRepository;
    @Mock
    private StockMovementRepository stockMovementRepository;
    @Mock
    private ArticlesService articlesService;
    @Mock
    private ArticleHistoryService articleHistoryService;
    @Mock
    private StockMovementService stockMovementService;
    @Mock
    private UserService userService;
    @InjectMocks
    private InventoryReconciliationService inventoryReconciliationService;

    private User currentUser;

    @BeforeEach
    void setUp() {
        currentUser = org.mockito.Mockito.mock(User.class);
    }

    private void givenCurrentUser() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn(USERNAME);
    }

    @Test
    void reconcileDebt_adjustToPhysical_clampsStockAtZeroAndRecordsOneLedgerEntry() {
        // Given
        givenCurrentUser();
        Articles article = articleWithStock(5);
        InventoryItem item = inventoryItem(article, InventoryItemStatus.DEBT, -8);
        when(inventoryItemRepository.findById(INVENTORY_ITEM_ID)).thenReturn(Optional.of(item));
        ReconciliationDto dto = reconciliationDto(ReconciliationAction.ADJUST_TO_PHYSICAL);

        // When
        InventoryItem result = inventoryReconciliationService.reconcileDebt(dto);

        // Then
        assertSame(item, result);
        assertEquals(0, article.getStockQuantity());
        assertEquals(InventoryItemStatus.RECONCILED, item.getStatus());
        assertTrue(item.getDebtCancelled());
        assertFalse(item.getMarkAsDebt());
        assertEquals("Contrôle inventaire", item.getReconciliationComment());
        assertEquals(USERNAME, item.getReconciledBy());

        ArgumentCaptor<ArticleHistory> historyCaptor = ArgumentCaptor.forClass(ArticleHistory.class);
        verify(articleHistoryService).create(historyCaptor.capture());
        ArticleHistory history = historyCaptor.getValue();
        assertEquals(5, history.getInitialQuantity());
        assertEquals(8, history.getOperationQuantity());
        assertEquals(0, history.getFinalQuantity());
        assertEquals(USERNAME, history.getOperationUser());

        verify(stockMovementService).recordMovementWithSnapshot(
                eq(article), eq(MovementType.INVENTORY_ADJUSTMENT), eq(8), eq(5), eq(0),
                contains("Correction erreur"), eq(USERNAME), isNull(), isNull(), eq(false));
        verify(articlesService).update(article);
        verify(inventoryItemRepository).save(item);
        verify(reconciliationRepository).save(any(InventoryReconciliation.class));
    }

    @Test
    void reconcileDebt_markAsDebt_keepsSystemStockAndDoesNotCreateAdjustmentLedger() {
        // Given
        givenCurrentUser();
        Articles article = articleWithStock(12);
        InventoryItem item = inventoryItem(article, InventoryItemStatus.DEBT, -3);
        when(inventoryItemRepository.findById(INVENTORY_ITEM_ID)).thenReturn(Optional.of(item));
        ReconciliationDto dto = reconciliationDto(ReconciliationAction.MARK_AS_DEBT);

        // When
        InventoryItem result = inventoryReconciliationService.reconcileDebt(dto);

        // Then
        assertSame(item, result);
        assertEquals(12, article.getStockQuantity());
        assertEquals(InventoryItemStatus.RECONCILED, item.getStatus());
        assertTrue(item.getMarkAsDebt());
        assertFalse(item.getDebtCancelled());
        verifyNoInteractions(articleHistoryService, stockMovementService);
    }

    @Test
    void reconcileSurplus_increasesStockAndRecordsInventoryAdjustment() {
        // Given
        givenCurrentUser();
        Articles article = articleWithStock(10);
        InventoryItem item = inventoryItem(article, InventoryItemStatus.SURPLUS, 4);
        when(inventoryItemRepository.findById(INVENTORY_ITEM_ID)).thenReturn(Optional.of(item));
        ReconciliationDto dto = reconciliationDto(ReconciliationAction.MARK_AS_SURPLUS);

        // When
        InventoryItem result = inventoryReconciliationService.reconcileSurplus(dto);

        // Then
        assertSame(item, result);
        assertEquals(14, article.getStockQuantity());
        assertEquals(InventoryItemStatus.RECONCILED, item.getStatus());
        assertEquals("Contrôle inventaire", item.getReconciliationComment());
        verify(stockMovementService).recordMovementWithSnapshot(
                eq(article), eq(MovementType.INVENTORY_ADJUSTMENT), eq(4), eq(10), eq(14),
                contains("Surplus"), eq(USERNAME), isNull(), isNull(), eq(false));
    }

    @Test
    void reconcileDebt_rejectsItemThatIsNotInDebt() {
        // Given
        InventoryItem item = inventoryItem(articleWithStock(8), InventoryItemStatus.SURPLUS, 2);
        when(inventoryItemRepository.findById(INVENTORY_ITEM_ID)).thenReturn(Optional.of(item));

        // When / Then
        assertThrows(ApplicationException.class,
                () -> inventoryReconciliationService.reconcileDebt(reconciliationDto(ReconciliationAction.ADJUST_TO_PHYSICAL)));
        verify(reconciliationRepository, never()).save(any());
        verify(articlesService, never()).update(any());
    }

    @Test
    void adjustStockToPhysical_rejectsItemWithoutDiscrepancy() {
        // Given
        InventoryItem item = inventoryItem(articleWithStock(8), InventoryItemStatus.VALIDATED, 0);
        when(inventoryItemRepository.findById(INVENTORY_ITEM_ID)).thenReturn(Optional.of(item));

        // When / Then
        assertThrows(ApplicationException.class,
                () -> inventoryReconciliationService.adjustStockToPhysical(INVENTORY_ITEM_ID, "Aucun écart"));
        verify(reconciliationRepository, never()).save(any());
    }

    private ReconciliationDto reconciliationDto(ReconciliationAction action) {
        ReconciliationDto dto = new ReconciliationDto();
        dto.setInventoryItemId(INVENTORY_ITEM_ID);
        dto.setAction(action);
        dto.setComment("Contrôle inventaire");
        return dto;
    }

    private Articles articleWithStock(int stockQuantity) {
        Articles article = new Articles();
        article.setId(7L);
        article.setName("Article test");
        article.setStockQuantity(stockQuantity);
        return article;
    }

    private InventoryItem inventoryItem(Articles article, InventoryItemStatus status, int difference) {
        InventoryItem item = new InventoryItem();
        item.setId(INVENTORY_ITEM_ID);
        item.setArticle(article);
        item.setStatus(status);
        item.setSystemQuantity(article.getStockQuantity());
        item.setPhysicalQuantity(article.getStockQuantity() + difference);
        item.setDifference(difference);
        return item;
    }
}
