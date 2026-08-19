package com.optimize.elykia.core.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.PhysicalQuantitySubmissionDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.inventory.Inventory;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import com.optimize.elykia.core.enumaration.InventoryStatus;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.InventoryItemRepository;
import com.optimize.elykia.core.repository.InventoryRepository;
import com.optimize.elykia.core.service.store.InventoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    private static final Long INVENTORY_ID = 101L;

    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private InventoryItemRepository inventoryItemRepository;
    @Mock
    private ArticlesRepository articlesRepository;
    @Mock
    private UserService userService;
    @InjectMocks
    private InventoryService inventoryService;

    @Test
    void createInventory_snapshotsAllEnabledArticlesIntoPendingItems() {
        // Given
        User currentUser = mock(User.class);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("inventory.manager");
        when(inventoryRepository.findCurrentInventory()).thenReturn(Optional.empty());
        Articles first = article(1L, "Article A", 12);
        Articles second = article(2L, "Article B", 4);
        when(articlesRepository.findByState(eq(State.ENABLED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(first, second)));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Inventory inventory = inventoryService.createInventory();

        // Then
        assertEquals(InventoryStatus.DRAFT, inventory.getStatus());
        assertEquals("inventory.manager", inventory.getCreatedByUser());
        assertEquals(2, inventory.getItems().size());
        assertTrue(inventory.getItems().stream().allMatch(item -> item.getStatus() == InventoryItemStatus.PENDING));
        assertEquals(List.of(12, 4), inventory.getItems().stream().map(InventoryItem::getSystemQuantity).toList());
        assertTrue(inventory.getItems().stream().allMatch(item -> item.getInventory() == inventory));
        verify(inventoryRepository).save(inventory);
    }

    @Test
    void createInventory_rejectsNewInventoryWhileAnotherIsInProgress() {
        // Given
        Inventory current = new Inventory();
        current.setStatus(InventoryStatus.IN_PROGRESS);
        when(inventoryRepository.findCurrentInventory()).thenReturn(Optional.of(current));

        // When / Then
        assertThrows(ApplicationException.class, () -> inventoryService.createInventory());
        verify(articlesRepository, never()).findByState(eq(State.ENABLED), any(Pageable.class));
        verify(inventoryRepository, never()).save(any());
    }

    @Test
    void submitPhysicalQuantities_calculatesDebtDifferenceAndMovesInventoryToInProgress() {
        // Given
        Inventory inventory = inventory(InventoryStatus.DRAFT);
        Articles article = article(7L, "Article à compter", 10);
        InventoryItem item = inventoryItem(inventory, article, InventoryItemStatus.PENDING);
        when(inventoryRepository.findById(INVENTORY_ID)).thenReturn(Optional.of(inventory));
        when(inventoryItemRepository.findByInventoryId(INVENTORY_ID)).thenReturn(List.of(item));
        when(inventoryRepository.saveAndFlush(inventory)).thenReturn(inventory);
        PhysicalQuantitySubmissionDto dto = new PhysicalQuantitySubmissionDto();
        dto.setInventoryId(INVENTORY_ID);
        dto.setItems(Map.of(7L, 6));

        // When
        Inventory result = inventoryService.submitPhysicalQuantities(dto);

        // Then
        assertEquals(InventoryStatus.IN_PROGRESS, result.getStatus());
        assertEquals(6, item.getPhysicalQuantity());
        assertEquals(-4, item.getDifference());
        assertEquals(InventoryItemStatus.DEBT, item.getStatus());
        verify(inventoryRepository).saveAndFlush(inventory);
    }

    @Test
    void finalizeInventory_rejectsWhenARecordedDiscrepancyIsStillUnreconciled() {
        // Given
        Inventory inventory = inventory(InventoryStatus.IN_PROGRESS);
        InventoryItem debt = inventoryItem(inventory, article(4L, "Article dette", 10), InventoryItemStatus.DEBT);
        debt.setDifference(-2);
        when(inventoryRepository.findById(INVENTORY_ID)).thenReturn(Optional.of(inventory));
        when(inventoryItemRepository.findByInventoryIdAndDifferenceNotZero(INVENTORY_ID)).thenReturn(List.of(debt));

        // When / Then
        assertThrows(ApplicationException.class, () -> inventoryService.finalizeInventory(INVENTORY_ID));
        verify(inventoryRepository, never()).saveAndFlush(any());
    }

    @Test
    void finalizeInventory_completesWhenEveryDiscrepancyIsReconciled() {
        // Given
        Inventory inventory = inventory(InventoryStatus.IN_PROGRESS);
        InventoryItem reconciled = inventoryItem(inventory, article(9L, "Article régularisé", 10), InventoryItemStatus.RECONCILED);
        reconciled.setDifference(-1);
        when(inventoryRepository.findById(INVENTORY_ID)).thenReturn(Optional.of(inventory));
        when(inventoryItemRepository.findByInventoryIdAndDifferenceNotZero(INVENTORY_ID)).thenReturn(List.of(reconciled));
        when(inventoryRepository.saveAndFlush(inventory)).thenReturn(inventory);

        // When
        Inventory result = inventoryService.finalizeInventory(INVENTORY_ID);

        // Then
        assertEquals(InventoryStatus.COMPLETED, result.getStatus());
        assertNotNull(result.getCompletedAt());
        verify(inventoryRepository).saveAndFlush(inventory);
    }

    private Inventory inventory(InventoryStatus status) {
        Inventory inventory = new Inventory();
        inventory.setId(INVENTORY_ID);
        inventory.setStatus(status);
        return inventory;
    }

    private Articles article(Long id, String name, int stockQuantity) {
        Articles article = new Articles();
        article.setId(id);
        article.setName(name);
        article.setStockQuantity(stockQuantity);
        return article;
    }

    private InventoryItem inventoryItem(Inventory inventory, Articles article, InventoryItemStatus status) {
        InventoryItem item = new InventoryItem();
        item.setInventory(inventory);
        item.setArticle(article);
        item.setSystemQuantity(article.getStockQuantity());
        item.setStatus(status);
        return item;
    }
}
