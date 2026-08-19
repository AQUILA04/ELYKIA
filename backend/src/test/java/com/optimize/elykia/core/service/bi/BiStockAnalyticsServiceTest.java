package com.optimize.elykia.core.service.bi;

import com.optimize.elykia.core.dto.bi.StockAlertDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.service.store.ArticlesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiStockAnalyticsServiceTest {

    @Mock private ArticlesService articlesService;
    @Mock private Articles outOfStock;
    @Mock private Articles highAlert;
    @Mock private Articles mediumAlert;
    @Mock private Articles healthyStock;

    @Test
    void getStockAlerts_calculatesUrgencyRecommendationAndCoverageForEveryStockThreshold() {
        // Given
        BiStockAnalyticsService service = new BiStockAnalyticsService(articlesService);
        stubArticle(outOfStock, 1L, "TV", 0, 10, 30, 5.0);
        stubArticle(highAlert, 2L, "Téléphone", 4, 10, 30, 8.0);
        stubArticle(mediumAlert, 3L, "Ventilateur", 8, 10, 25, 4.0);
        when(healthyStock.getStockQuantity()).thenReturn(20);
        when(healthyStock.getReorderPoint()).thenReturn(10);
        when(articlesService.getAll()).thenReturn(List.of(healthyStock, mediumAlert, highAlert, outOfStock));

        // When
        List<StockAlertDto> alerts = service.getStockAlerts();

        // Then
        assertEquals(3, alerts.size());
        assertEquals("CRITICAL", alerts.get(0).getUrgency());
        assertEquals(0, alerts.get(0).getCurrentStock());
        assertEquals(30, alerts.get(0).getRecommendedQuantity());
        assertEquals(0, alerts.get(0).getDaysOfStockRemaining());
        assertEquals("HIGH", alerts.get(1).getUrgency());
        assertEquals(26, alerts.get(1).getRecommendedQuantity());
        assertEquals(15, alerts.get(1).getDaysOfStockRemaining());
        assertEquals("MEDIUM", alerts.get(2).getUrgency());
        assertEquals(17, alerts.get(2).getRecommendedQuantity());
        assertEquals(60, alerts.get(2).getDaysOfStockRemaining());
    }

    @Test
    void getOutOfStockItems_andGetLowStockItems_keepTheTwoBusinessPopulationsSeparate() {
        // Given
        BiStockAnalyticsService service = new BiStockAnalyticsService(articlesService);
        stubArticle(outOfStock, 1L, "TV", 0, 10, 30, 5.0);
        stubArticle(highAlert, 2L, "Téléphone", 4, 10, 30, 8.0);
        when(articlesService.getAll()).thenReturn(List.of(outOfStock, highAlert));

        // When
        List<StockAlertDto> outOfStockItems = service.getOutOfStockItems();
        List<StockAlertDto> lowStockItems = service.getLowStockItems();

        // Then
        assertEquals(1, outOfStockItems.size());
        assertEquals(1L, outOfStockItems.get(0).getArticleId());
        assertEquals(1, lowStockItems.size());
        assertEquals(2L, lowStockItems.get(0).getArticleId());
    }

    private void stubArticle(Articles article, Long id, String name, Integer stock, Integer reorderPoint,
                             Integer optimalStock, Double averageMonthlySales) {
        when(article.getId()).thenReturn(id);
        when(article.getCommercialName()).thenReturn(name);
        when(article.getCategory()).thenReturn("ELECTRONIQUE");
        when(article.getStockQuantity()).thenReturn(stock);
        when(article.getReorderPoint()).thenReturn(reorderPoint);
        when(article.getOptimalStockLevel()).thenReturn(optimalStock);
        when(article.getAverageMonthlySales()).thenReturn(averageMonthlySales);
    }
}
