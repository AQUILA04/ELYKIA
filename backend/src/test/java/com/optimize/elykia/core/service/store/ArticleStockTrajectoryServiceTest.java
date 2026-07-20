package com.optimize.elykia.core.service.store;

import com.optimize.elykia.core.dto.ArticleStockTrajectoryDto;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.inventory.Inventory;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.entity.inventory.InventoryReconciliation;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import com.optimize.elykia.core.enumaration.InventoryStatus;
import com.optimize.elykia.core.enumaration.ReconciliationAction;
import com.optimize.elykia.core.enumaration.StockOperationType;
import com.optimize.elykia.core.enumaration.TimelineNodeKind;
import com.optimize.elykia.core.repository.ArticleHistoryRepository;
import com.optimize.elykia.core.repository.InventoryItemRepository;
import com.optimize.elykia.core.repository.InventoryReconciliationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleStockTrajectoryServiceTest {

    @Mock
    private InventoryItemRepository inventoryItemRepository;
    @Mock
    private ArticleHistoryRepository articleHistoryRepository;
    @Mock
    private InventoryReconciliationRepository reconciliationRepository;

    @InjectMocks
    private ArticleStockTrajectoryService trajectoryService;

    private Articles article;
    private Inventory inventory;
    private InventoryItem sourceItem;

    @BeforeEach
    void setUp() {
        article = new Articles();
        article.setId(10L);
        article.setName("TV Samsung");
        article.setMarque("Samsung");
        article.setModel("Q60");
        article.setStockQuantity(8);

        inventory = new Inventory();
        inventory.setId(1L);
        inventory.setInventoryDate(LocalDate.of(2026, 1, 10));
        inventory.setCompletedAt(LocalDateTime.of(2026, 1, 10, 18, 0));
        inventory.setStatus(InventoryStatus.COMPLETED);

        sourceItem = new InventoryItem();
        sourceItem.setId(100L);
        sourceItem.setInventory(inventory);
        sourceItem.setArticle(article);
        sourceItem.setSystemQuantity(10);
        sourceItem.setPhysicalQuantity(10);
        sourceItem.setDifference(0);
        sourceItem.setStatus(InventoryItemStatus.VALIDATED);
    }

    @Test
    void validatedBaseline_usesPhysicalQuantity() {
        when(inventoryItemRepository.findByIdWithInventoryAndArticle(100L)).thenReturn(Optional.of(sourceItem));
        when(reconciliationRepository.findByInventoryItemIdOrderByPerformedAtDesc(anyLong()))
                .thenReturn(Collections.emptyList());
        when(articleHistoryRepository.findByArticleIdAndOccurredAtBetweenOrderByOccurredAtAsc(anyLong(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(inventoryItemRepository.findByArticleIdAndInventoryStatusIn(anyLong(), anyList()))
                .thenReturn(Collections.emptyList());

        ArticleStockTrajectoryDto dto = trajectoryService.getTrajectoryFromInventoryItem(100L, LocalDate.of(2026, 1, 15));

        assertEquals(10, dto.getFrom().getBaselineSystemQuantity());
        assertEquals(10, dto.getReconstructedQuantity());
        assertEquals(2, dto.getDrift()); // reconstructed 10 vs current 8
        assertTrue(dto.getNodes().isEmpty());
    }

    @Test
    void debtWithoutAdjustment_keepsSystemBaseline() {
        sourceItem.setSystemQuantity(12);
        sourceItem.setPhysicalQuantity(9);
        sourceItem.setDifference(-3);
        sourceItem.setStatus(InventoryItemStatus.RECONCILED);
        sourceItem.setMarkAsDebt(true);
        sourceItem.setDebtCancelled(false);

        when(inventoryItemRepository.findByIdWithInventoryAndArticle(100L)).thenReturn(Optional.of(sourceItem));
        when(reconciliationRepository.findByInventoryItemIdOrderByPerformedAtDesc(100L))
                .thenReturn(List.of(reconciliation(ReconciliationAction.MARK_AS_DEBT)));
        when(articleHistoryRepository.findByArticleIdAndOccurredAtBetweenOrderByOccurredAtAsc(anyLong(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(inventoryItemRepository.findByArticleIdAndInventoryStatusIn(anyLong(), anyList()))
                .thenReturn(Collections.emptyList());

        ArticleStockTrajectoryDto dto = trajectoryService.getTrajectoryFromInventoryItem(100L, LocalDate.of(2026, 2, 1));

        assertEquals(12, dto.getFrom().getBaselineSystemQuantity());
        assertEquals(ReconciliationAction.MARK_AS_DEBT, dto.getFrom().getReconciliationAction());
    }

    @Test
    void reconstructsWithMovementsAndIntermediateInventory() {
        ArticleHistory sortie = new ArticleHistory();
        sortie.setId(1L);
        sortie.setArticles(article);
        sortie.setOperationType(StockOperationType.SORTIE);
        sortie.setInitialQuantity(10);
        sortie.setOperationQuantity(3);
        sortie.setFinalQuantity(7);
        sortie.setOccurredAt(LocalDateTime.of(2026, 1, 12, 10, 0));
        sortie.setOperationUser("commercial");

        ArticleHistory entree = new ArticleHistory();
        entree.setId(2L);
        entree.setArticles(article);
        entree.setOperationType(StockOperationType.ENTREE);
        entree.setInitialQuantity(7);
        entree.setOperationQuantity(2);
        entree.setFinalQuantity(9);
        entree.setOccurredAt(LocalDateTime.of(2026, 1, 20, 11, 0));
        entree.setOperationUser("store");

        Inventory midInv = new Inventory();
        midInv.setId(2L);
        midInv.setInventoryDate(LocalDate.of(2026, 1, 15));
        midInv.setCompletedAt(LocalDateTime.of(2026, 1, 15, 17, 0));
        midInv.setStatus(InventoryStatus.COMPLETED);

        InventoryItem midItem = new InventoryItem();
        midItem.setId(200L);
        midItem.setInventory(midInv);
        midItem.setArticle(article);
        midItem.setSystemQuantity(7);
        midItem.setPhysicalQuantity(7);
        midItem.setDifference(0);
        midItem.setStatus(InventoryItemStatus.VALIDATED);

        when(inventoryItemRepository.findByIdWithInventoryAndArticle(100L)).thenReturn(Optional.of(sourceItem));
        when(reconciliationRepository.findByInventoryItemIdOrderByPerformedAtDesc(anyLong()))
                .thenReturn(Collections.emptyList());
        when(articleHistoryRepository.findByArticleIdAndOccurredAtBetweenOrderByOccurredAtAsc(eq(10L), any(), any()))
                .thenReturn(List.of(sortie, entree));
        when(inventoryItemRepository.findByArticleIdAndInventoryStatusIn(eq(10L), anyList()))
                .thenReturn(List.of(sourceItem, midItem));

        ArticleStockTrajectoryDto dto = trajectoryService.getTrajectoryFromInventoryItem(100L, LocalDate.of(2026, 1, 31));

        assertEquals(9, dto.getReconstructedQuantity());
        assertEquals(2, dto.getSummary().getTotalIn());
        assertEquals(3, dto.getSummary().getTotalOut());
        assertEquals(-1, dto.getSummary().getNetDelta());
        assertEquals(2, dto.getSummary().getMovementCount());
        assertEquals(1, dto.getSummary().getIntermediateInventoryCount());
        assertEquals(1, dto.getDrift()); // 9 reconstructed vs 8 current

        assertEquals(3, dto.getNodes().size());
        assertEquals(TimelineNodeKind.MOVEMENT, dto.getNodes().get(0).getKind());
        assertEquals(TimelineNodeKind.INVENTORY_CHECKPOINT, dto.getNodes().get(1).getKind());
        assertEquals(TimelineNodeKind.MOVEMENT, dto.getNodes().get(2).getKind());
        assertFalse(Boolean.TRUE.equals(dto.getNodes().get(1).getGapDetected()));
    }

    @Test
    void resetMovement_appliesSignedDeltaToZero() {
        ArticleHistory reset = new ArticleHistory();
        reset.setId(5L);
        reset.setArticles(article);
        reset.setOperationType(StockOperationType.RESET);
        reset.setInitialQuantity(10);
        reset.setOperationQuantity(0);
        reset.setFinalQuantity(0);
        reset.setOccurredAt(LocalDateTime.of(2026, 1, 11, 9, 0));

        when(inventoryItemRepository.findByIdWithInventoryAndArticle(100L)).thenReturn(Optional.of(sourceItem));
        when(reconciliationRepository.findByInventoryItemIdOrderByPerformedAtDesc(anyLong()))
                .thenReturn(Collections.emptyList());
        when(articleHistoryRepository.findByArticleIdAndOccurredAtBetweenOrderByOccurredAtAsc(anyLong(), any(), any()))
                .thenReturn(List.of(reset));
        when(inventoryItemRepository.findByArticleIdAndInventoryStatusIn(anyLong(), anyList()))
                .thenReturn(Collections.emptyList());

        ArticleStockTrajectoryDto dto = trajectoryService.getTrajectoryFromInventoryItem(100L, LocalDate.of(2026, 1, 12));

        assertEquals(0, dto.getReconstructedQuantity());
        assertEquals(1, dto.getNodes().size());
        assertEquals(-10, dto.getNodes().get(0).getDelta());
    }

    @Test
    void adjustToPhysical_usesPhysicalAsBaseline() {
        sourceItem.setSystemQuantity(15);
        sourceItem.setPhysicalQuantity(12);
        sourceItem.setDifference(-3);
        sourceItem.setStatus(InventoryItemStatus.RECONCILED);
        sourceItem.setDebtCancelled(true);

        when(inventoryItemRepository.findByIdWithInventoryAndArticle(100L)).thenReturn(Optional.of(sourceItem));
        when(reconciliationRepository.findByInventoryItemIdOrderByPerformedAtDesc(100L))
                .thenReturn(List.of(reconciliation(ReconciliationAction.ADJUST_TO_PHYSICAL)));
        when(articleHistoryRepository.findByArticleIdAndOccurredAtBetweenOrderByOccurredAtAsc(anyLong(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(inventoryItemRepository.findByArticleIdAndInventoryStatusIn(anyLong(), anyList()))
                .thenReturn(Collections.emptyList());

        ArticleStockTrajectoryDto dto = trajectoryService.getTrajectoryFromInventoryItem(100L, null);

        assertEquals(12, dto.getFrom().getBaselineSystemQuantity());
        assertEquals(12, dto.getReconstructedQuantity());
    }

    private InventoryReconciliation reconciliation(ReconciliationAction action) {
        InventoryReconciliation r = new InventoryReconciliation();
        r.setAction(action);
        r.setPerformedAt(LocalDateTime.of(2026, 1, 10, 18, 30));
        return r;
    }
}
