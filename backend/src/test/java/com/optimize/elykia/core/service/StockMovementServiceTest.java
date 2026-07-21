package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.ArticleHistoryContext;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.stock.StockMovement;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockHistoryReferenceType;
import com.optimize.elykia.core.repository.StockMovementRepository;
import com.optimize.elykia.core.service.stock.StockMovementService;
import com.optimize.elykia.core.service.store.ArticleHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StockMovementServiceTest {

    @Mock
    private StockMovementRepository stockMovementRepository;
    @Mock
    private ArticleHistoryService articleHistoryService;

    private StockMovementService stockMovementService;

    private Articles article;
    private Credit credit;

    @BeforeEach
    void setUp() {
        stockMovementService = new StockMovementService(
                stockMovementRepository, stockMovementRepository, articleHistoryService);

        article = new Articles();
        article.setId(1L);
        article.setName("iPhone 13");
        article.setStockQuantity(10);
        article.setPurchasePrice(500000.0);

        credit = new Credit();
        credit.setId(1L);
    }

    @Test
    void testRecordMovement_WithHistoryContext() {
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(articleHistoryService.create(any(ArticleHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ArticleHistoryContext context = ArticleHistoryContext.withReference(
                "ges003",
                StockHistoryReferenceType.STOCK_REQUEST,
                42L,
                "DS-2026-0142");

        stockMovementService.recordMovement(
                article, MovementType.RELEASE, 2,
                "Livraison demande DS-2026-0142", "mag001", null, null, context);

        verify(articleHistoryService).create(argThat(history ->
                "ges003".equals(history.getBeneficiary())
                        && StockHistoryReferenceType.STOCK_REQUEST == history.getReferenceType()
                        && Long.valueOf(42L).equals(history.getReferenceId())
                        && "DS-2026-0142".equals(history.getReferenceLabel())
                        && "mag001".equals(history.getOperationUser())));
    }

    @Test
    void testRecordMovement_DefaultBeneficiaryFromPerformer() {
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(articleHistoryService.create(any(ArticleHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        stockMovementService.recordMovement(
                article, MovementType.ENTRY, 5, "Réapprovisionnement", "admin", null);

        verify(articleHistoryService).create(argThat(history ->
                "admin".equals(history.getBeneficiary())
                        && "admin".equals(history.getOperationUser())));
    }

    @Test
    void testRecordMovement_Entry() {
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(articleHistoryService.create(any(ArticleHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockMovement movement = stockMovementService.recordMovement(
                article, MovementType.ENTRY, 5, "Réapprovisionnement", "admin", null);

        assertNotNull(movement);
        assertEquals(MovementType.ENTRY, movement.getType());
        assertEquals(5, movement.getQuantity());
        assertEquals(10, movement.getStockBefore());
        assertEquals(15, movement.getStockAfter());
        assertEquals(10, article.getStockQuantity()); // ledger only — article stock unchanged here
        assertEquals("Réapprovisionnement", movement.getReason());
        assertEquals("admin", movement.getPerformedBy());
        assertEquals(500000.0, movement.getUnitCost());
        verify(stockMovementRepository).save(any(StockMovement.class));
        verify(articleHistoryService).create(any(ArticleHistory.class));
    }

    @Test
    void testRecordMovement_Release() {
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(articleHistoryService.create(any(ArticleHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockMovement movement = stockMovementService.recordMovement(
                article, MovementType.RELEASE, 3, "Vente crédit #123", "commercial1", credit);

        assertNotNull(movement);
        assertEquals(MovementType.RELEASE, movement.getType());
        assertEquals(3, movement.getQuantity());
        assertEquals(10, movement.getStockBefore());
        assertEquals(7, movement.getStockAfter());
        assertEquals(10, article.getStockQuantity());
        assertEquals(credit, movement.getRelatedCredit());
    }

    @Test
    void testRecordMovement_Return() {
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(articleHistoryService.create(any(ArticleHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockMovement movement = stockMovementService.recordMovement(
                article, MovementType.RETURN, 2, "Retour client", "commercial1", credit);

        assertNotNull(movement);
        assertEquals(MovementType.RETURN, movement.getType());
        assertEquals(12, movement.getStockAfter());
        assertEquals(10, article.getStockQuantity());
    }

    @Test
    void testRecordMovement_Loss() {
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(articleHistoryService.create(any(ArticleHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockMovement movement = stockMovementService.recordMovement(
                article, MovementType.LOSS, 1, "Article endommagé", "admin", null);

        assertNotNull(movement);
        assertEquals(MovementType.LOSS, movement.getType());
        assertEquals(9, movement.getStockAfter());
        assertEquals(10, article.getStockQuantity());
    }

    @Test
    void testRecordMovementWithSnapshot_skipsHistoryWhenRequested() {
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockMovement movement = stockMovementService.recordMovementWithSnapshot(
                article, MovementType.INVENTORY_ADJUSTMENT, 3, 15, 12,
                "Ajustement inventaire", "admin", null, null, false);

        assertEquals(15, movement.getStockBefore());
        assertEquals(12, movement.getStockAfter());
        verify(articleHistoryService, never()).create(any());
    }

    @Test
    void testGetMovementsByArticle() {
        List<StockMovement> movements = Arrays.asList(
                createMovement(MovementType.ENTRY, 5),
                createMovement(MovementType.RELEASE, 3));
        when(stockMovementRepository.findByArticleIdOrderByMovementDateDesc(1L))
                .thenReturn(movements);

        List<StockMovement> result = stockMovementService.getMovementsByArticle(1L);

        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    void testGetMovementsByCredit() {
        List<StockMovement> movements = Arrays.asList(createMovement(MovementType.RELEASE, 3));
        when(stockMovementRepository.findByRelatedCreditId(1L)).thenReturn(movements);

        List<StockMovement> result = stockMovementService.getMovementsByCredit(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
    }

    @Test
    void testGetTotalSalesForArticle() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        LocalDateTime endDate = LocalDateTime.now();
        when(stockMovementRepository.sumQuantityByArticleAndTypeAndDateRange(
                1L, MovementType.RELEASE, startDate, endDate)).thenReturn(45);

        Integer totalSales = stockMovementService.getTotalSalesForArticle(1L, startDate, endDate);

        assertEquals(45, totalSales);
    }

    @Test
    void testGetTotalSalesForArticle_NoSales() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        LocalDateTime endDate = LocalDateTime.now();
        when(stockMovementRepository.sumQuantityByArticleAndTypeAndDateRange(
                1L, MovementType.RELEASE, startDate, endDate)).thenReturn(null);

        Integer totalSales = stockMovementService.getTotalSalesForArticle(1L, startDate, endDate);

        assertEquals(0, totalSales);
    }

    private StockMovement createMovement(MovementType type, Integer quantity) {
        StockMovement movement = new StockMovement();
        movement.setType(type);
        movement.setQuantity(quantity);
        movement.setMovementDate(LocalDateTime.now());
        return movement;
    }
}
