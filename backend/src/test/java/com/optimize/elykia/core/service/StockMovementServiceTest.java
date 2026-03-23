package com.optimize.elykia.core.service;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.stock.StockMovement;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.repository.StockMovementRepository;
import com.optimize.elykia.core.service.stock.StockMovementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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

    @InjectMocks
    private StockMovementService stockMovementService;

    private Articles article;
    private Credit credit;

    @BeforeEach
    void setUp() {
        article = new Articles();
        article.setId(1L);
        article.setName("iPhone 13");
        article.setStockQuantity(10);
        article.setPurchasePrice(500000.0);

        credit = new Credit();
        credit.setId(1L);
    }

    @Test
    void testRecordMovement_Entry() {
        // Given
        when(stockMovementRepository.save(any(StockMovement.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        StockMovement movement = stockMovementService.recordMovement(
            article, MovementType.ENTRY, 5, "Réapprovisionnement", "admin", null
        );

        // Then
        assertNotNull(movement);
        assertEquals(MovementType.ENTRY, movement.getType());
        assertEquals(5, movement.getQuantity());
        assertEquals(10, movement.getStockBefore());
        assertEquals(15, movement.getStockAfter());
        assertEquals(15, article.getStockQuantity()); // Stock mis à jour
        assertEquals("Réapprovisionnement", movement.getReason());
        assertEquals("admin", movement.getPerformedBy());
        assertEquals(500000.0, movement.getUnitCost());
        verify(stockMovementRepository).save(any(StockMovement.class));
    }

    @Test
    void testRecordMovement_Release() {
        // Given
        when(stockMovementRepository.save(any(StockMovement.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        StockMovement movement = stockMovementService.recordMovement(
            article, MovementType.RELEASE, 3, "Vente crédit #123", "commercial1", credit
        );

        // Then
        assertNotNull(movement);
        assertEquals(MovementType.RELEASE, movement.getType());
        assertEquals(3, movement.getQuantity());
        assertEquals(10, movement.getStockBefore());
        assertEquals(7, movement.getStockAfter());
        assertEquals(7, article.getStockQuantity()); // Stock mis à jour
        assertEquals(credit, movement.getRelatedCredit());
    }

    @Test
    void testRecordMovement_Return() {
        // Given
        when(stockMovementRepository.save(any(StockMovement.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        StockMovement movement = stockMovementService.recordMovement(
            article, MovementType.RETURN, 2, "Retour client", "commercial1", credit
        );

        // Then
        assertNotNull(movement);
        assertEquals(MovementType.RETURN, movement.getType());
        assertEquals(12, article.getStockQuantity()); // Stock augmenté
    }

    @Test
    void testRecordMovement_Loss() {
        // Given
        when(stockMovementRepository.save(any(StockMovement.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        StockMovement movement = stockMovementService.recordMovement(
            article, MovementType.LOSS, 1, "Article endommagé", "admin", null
        );

        // Then
        assertNotNull(movement);
        assertEquals(MovementType.LOSS, movement.getType());
        assertEquals(9, article.getStockQuantity()); // Stock diminué
    }

    @Test
    void testGetMovementsByArticle() {
        // Given
        List<StockMovement> movements = Arrays.asList(
            createMovement(MovementType.ENTRY, 5),
            createMovement(MovementType.RELEASE, 3)
        );
        when(stockMovementRepository.findByArticleIdOrderByMovementDateDesc(1L))
            .thenReturn(movements);

        // When
        List<StockMovement> result = stockMovementService.getMovementsByArticle(1L);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    void testGetMovementsByCredit() {
        // Given
        List<StockMovement> movements = Arrays.asList(
            createMovement(MovementType.RELEASE, 3)
        );
        when(stockMovementRepository.findByRelatedCreditId(1L))
            .thenReturn(movements);

        // When
        List<StockMovement> result = stockMovementService.getMovementsByCredit(1L);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
    }

    @Test
    void testGetTotalSalesForArticle() {
        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        LocalDateTime endDate = LocalDateTime.now();
        when(stockMovementRepository.sumQuantityByArticleAndTypeAndDateRange(
            1L, MovementType.RELEASE, startDate, endDate
        )).thenReturn(45);

        // When
        Integer totalSales = stockMovementService.getTotalSalesForArticle(1L, startDate, endDate);

        // Then
        assertEquals(45, totalSales);
    }

    @Test
    void testGetTotalSalesForArticle_NoSales() {
        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        LocalDateTime endDate = LocalDateTime.now();
        when(stockMovementRepository.sumQuantityByArticleAndTypeAndDateRange(
            1L, MovementType.RELEASE, startDate, endDate
        )).thenReturn(null);

        // When
        Integer totalSales = stockMovementService.getTotalSalesForArticle(1L, startDate, endDate);

        // Then
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
