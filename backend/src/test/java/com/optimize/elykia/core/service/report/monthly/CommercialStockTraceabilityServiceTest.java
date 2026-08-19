package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialStockTraceabilityServiceTest {

    @Mock
    private CommercialStockMovementRepository movementRepository;
    @Mock
    private MonthlyReportMarginCalculator marginCalculator;
    @Mock
    private CommercialStockMovement movement;
    @Mock
    private Articles article;
    @InjectMocks
    private CommercialStockTraceabilityService service;

    @Test
    void buildTimeline_usesMonthlyBoundsAndCalculatesMissingMargin() {
        // Given
        LocalDateTime operationDate = LocalDateTime.of(2026, 8, 15, 10, 30);
        when(movementRepository.findTimelineByCollector(
                "collector.a", LocalDateTime.of(2026, 8, 1, 0, 0), LocalDateTime.of(2026, 8, 31, 23, 59, 59)))
                .thenReturn(List.of(movement));
        when(movement.getOperationDate()).thenReturn(operationDate);
        when(movement.getArticle()).thenReturn(article);
        when(article.getCommercialName()).thenReturn("Téléviseur");
        when(movement.getMovementType()).thenReturn(CommercialStockMovementType.CREDIT_SALE);
        when(movement.getQuantityBefore()).thenReturn(10);
        when(movement.getQuantityMoved()).thenReturn(2);
        when(movement.getQuantityAfter()).thenReturn(8);
        when(movement.getUnitPurchasePrice()).thenReturn(100.0);
        when(movement.getUnitSalePrice()).thenReturn(150.0);
        when(movement.getMarginAmount()).thenReturn(null);
        when(marginCalculator.lineMargin(150.0, 100.0, 2)).thenReturn(100.0);

        // When
        List<Map<String, Object>> result = service.buildTimeline("collector.a", 2026, 8);

        // Then
        assertEquals(1, result.size());
        Map<String, Object> line = result.get(0);
        assertEquals(operationDate, line.get("operationDate"));
        assertEquals("Téléviseur", line.get("articleName"));
        assertEquals("Vente à crédit", line.get("movementTypeLabel"));
        assertEquals(10, line.get("quantityBefore"));
        assertEquals(2, line.get("quantityMoved"));
        assertEquals(8, line.get("quantityAfter"));
        assertEquals(100.0, line.get("marginAmount"));
        verify(marginCalculator).lineMargin(150.0, 100.0, 2);
    }

    @Test
    void buildTimeline_preservesStoredMarginAndNormalizesMissingArticleAndType() {
        // Given
        when(movementRepository.findTimelineByCollector(
                "collector.a", LocalDateTime.of(2026, 2, 1, 0, 0), LocalDateTime.of(2026, 2, 28, 23, 59, 59)))
                .thenReturn(List.of(movement));
        when(movement.getArticle()).thenReturn(null);
        when(movement.getMovementType()).thenReturn(null);
        when(movement.getQuantityBefore()).thenReturn(0);
        when(movement.getQuantityMoved()).thenReturn(0);
        when(movement.getQuantityAfter()).thenReturn(0);
        when(movement.getUnitPurchasePrice()).thenReturn(null);
        when(movement.getUnitSalePrice()).thenReturn(null);
        when(movement.getMarginAmount()).thenReturn(25.0);

        // When
        Map<String, Object> line = service.buildTimeline("collector.a", 2026, 2).get(0);

        // Then
        assertEquals(null, line.get("articleName"));
        assertEquals("-", line.get("movementTypeLabel"));
        assertEquals(25.0, line.get("marginAmount"));
    }
}
