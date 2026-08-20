package com.optimize.elykia.core.service.bi;

import com.optimize.elykia.core.dto.bi.ArticlePerformanceDto;
import com.optimize.elykia.core.dto.bi.ArticlePerformanceProjection;
import com.optimize.elykia.core.dto.bi.CommercialPerformanceDto;
import com.optimize.elykia.core.dto.bi.CommercialSalesProjection;
import com.optimize.elykia.core.repository.CreditRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiSalesAnalyticsServiceTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CommercialSalesProjection zeroSalesCommercial;
    @Mock private ArticlePerformanceProjection primaryArticle;
    @Mock private ArticlePerformanceProjection secondaryArticle;

    @Test
    void getCommercialRanking_preservesPeriodAndProtectsCollectionRateWhenTotalSalesIsZero() {
        // Given
        BiSalesAnalyticsService service = new BiSalesAnalyticsService(creditRepository);
        LocalDate start = LocalDate.of(2026, 8, 1);
        LocalDate end = LocalDate.of(2026, 8, 31);
        when(zeroSalesCommercial.getCollector()).thenReturn("commercial.a");
        when(zeroSalesCommercial.getSalesCount()).thenReturn(0);
        when(zeroSalesCommercial.getTotalAmount()).thenReturn(0.0);
        when(zeroSalesCommercial.getTotalProfit()).thenReturn(0.0);
        when(zeroSalesCommercial.getAvgAmount()).thenReturn(0.0);
        when(zeroSalesCommercial.getTotalCollected()).thenReturn(2_000.0);
        when(creditRepository.getSalesByCommercial(start, end)).thenReturn(List.of(zeroSalesCommercial));

        // When
        List<CommercialPerformanceDto> ranking = service.getCommercialRanking(start, end);

        // Then
        assertEquals(1, ranking.size());
        CommercialPerformanceDto commercial = ranking.get(0);
        assertEquals("commercial.a", commercial.getCollector());
        assertEquals(start, commercial.getPeriodStart());
        assertEquals(end, commercial.getPeriodEnd());
        assertEquals(0, commercial.getTotalSalesCount());
        assertEquals(2_000.0, commercial.getTotalCollected());
        assertEquals(0.0, commercial.getCollectionRate());
    }

    @Test
    void getArticlePerformance_calculatesProfitMarginsAndRevenueContributionAcrossAllArticles() {
        // Given
        BiSalesAnalyticsService service = new BiSalesAnalyticsService(creditRepository);
        LocalDate start = LocalDate.of(2026, 8, 1);
        LocalDate end = LocalDate.of(2026, 8, 31);
        stubArticle(primaryArticle, 1L, "Téléviseur", "TV", 5, 30_000.0, 9_000.0, 1.5, 12);
        stubArticle(secondaryArticle, 2L, "Téléphone", "PHONE", 3, 10_000.0, 1_000.0, 0.8, 7);
        when(creditRepository.getArticlePerformance(start, end)).thenReturn(List.of(primaryArticle, secondaryArticle));

        // When
        List<ArticlePerformanceDto> performance = service.getArticlePerformance(start, end);

        // Then
        assertEquals(2, performance.size());
        assertEquals(30.0, performance.get(0).getProfitMargin());
        assertEquals(75.0, performance.get(0).getContributionToRevenue());
        assertEquals(10.0, performance.get(1).getProfitMargin());
        assertEquals(25.0, performance.get(1).getContributionToRevenue());
        assertEquals(1.5, performance.get(0).getTurnoverRate());
        assertEquals(7, performance.get(1).getStockQuantity());
    }

    private void stubArticle(ArticlePerformanceProjection projection, Long id, String name, String category,
                             Integer quantity, Double revenue, Double profit, Double turnover, Integer stockQuantity) {
        when(projection.getArticleId()).thenReturn(id);
        when(projection.getArticleName()).thenReturn(name);
        when(projection.getCategory()).thenReturn(category);
        when(projection.getQuantitySold()).thenReturn(quantity);
        when(projection.getTotalRevenue()).thenReturn(revenue);
        when(projection.getTotalProfit()).thenReturn(profit);
        when(projection.getTurnoverRate()).thenReturn(turnover);
        when(projection.getStockQuantity()).thenReturn(stockQuantity);
    }
}
