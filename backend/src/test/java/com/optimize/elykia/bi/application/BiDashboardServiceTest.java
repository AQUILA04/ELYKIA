package com.optimize.elykia.bi.application;

import com.optimize.elykia.bi.web.dto.CollectionMetricsDto;
import com.optimize.elykia.bi.web.dto.DashboardOverviewDto;
import com.optimize.elykia.bi.web.dto.PortfolioMetricsDto;
import com.optimize.elykia.bi.web.dto.PortfolioMetricsProjection;
import com.optimize.elykia.bi.web.dto.SalesMetricsDto;
import com.optimize.elykia.bi.web.dto.SalesMetricsProjection;
import com.optimize.elykia.inventory.web.dto.StockMetricsDto;
import com.optimize.elykia.bi.infrastructure.persistence.BiCreditQueryRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditTimelineRepository;
import com.optimize.elykia.inventory.application.StockMovementService;
import com.optimize.elykia.inventory.application.ArticlesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiDashboardServiceTest {

    @Mock
    private CreditRepository creditRepository;
    @Mock
    private BiCreditQueryRepository biCreditQueryRepository;
    @Mock
    private CreditTimelineRepository creditTimelineRepository;
    @Mock
    private ArticlesService articlesService;
    @Mock
    private StockMovementService stockMovementService;
    @InjectMocks
    private BiDashboardService biDashboardService;

    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() {
        startDate = LocalDate.of(2026, 7, 1);
        endDate = LocalDate.of(2026, 7, 31);
    }

    @Test
    void getSalesMetrics_returnsCurrentAggregatesWhenPreviousPeriodHasNoSale() {
        // Given
        when(biCreditQueryRepository.getSalesMetrics(startDate, endDate))
                .thenReturn(salesProjection(2, 250_000.0, 50_000.0, 125_000.0));
        when(biCreditQueryRepository.getSalesMetrics(previousStart(), previousEnd()))
                .thenReturn(salesProjection(0, 0.0, 0.0, 0.0));

        // When
        SalesMetricsDto metrics = biDashboardService.getSalesMetrics(startDate, endDate);

        // Then
        assertEquals(2, metrics.getCount());
        assertEquals(250_000.0, metrics.getTotalAmount());
        assertEquals(50_000.0, metrics.getTotalProfit());
        assertEquals(20.0, metrics.getProfitMargin(), 0.01);
        assertEquals(125_000.0, metrics.getAverageSaleAmount());
        assertEquals(0.0, metrics.getEvolution());
    }

    @Test
    void getSalesMetrics_calculatesEvolutionAgainstPreviousPeriod() {
        // Given
        when(biCreditQueryRepository.getSalesMetrics(startDate, endDate))
                .thenReturn(salesProjection(1, 250_000.0, 50_000.0, 250_000.0));
        when(biCreditQueryRepository.getSalesMetrics(previousStart(), previousEnd()))
                .thenReturn(salesProjection(1, 200_000.0, 40_000.0, 200_000.0));

        // When
        SalesMetricsDto metrics = biDashboardService.getSalesMetrics(startDate, endDate);

        // Then
        assertEquals(25.0, metrics.getEvolution(), 0.01);
    }

    @Test
    void getCollectionMetrics_calculatesCollectionRateAndEvolution() {
        // Given
        when(creditTimelineRepository.sumAmountByDateAndCreditType(
                startDate.atStartOfDay(), endDate.atTime(23, 59, 59), "CREDIT"))
                .thenReturn(125_000.0);
        when(creditTimelineRepository.sumAmountByDateAndCreditType(
                previousStart().atStartOfDay(), previousEnd().atTime(23, 59, 59), "CREDIT"))
                .thenReturn(100_000.0);
        when(creditRepository.getTotalExpectedAmountForActiveCredits()).thenReturn(250_000.0);

        // When
        CollectionMetricsDto metrics = biDashboardService.getCollectionMetrics(startDate, endDate);

        // Then
        assertEquals(125_000.0, metrics.getTotalCollected());
        assertEquals(50.0, metrics.getCollectionRate(), 0.01);
        assertEquals(25.0, metrics.getEvolution(), 0.01);
    }

    @Test
    void getCollectionMetrics_treatsNullAggregatesAsZero() {
        // Given
        when(creditTimelineRepository.sumAmountByDateAndCreditType(
                any(LocalDateTime.class), any(LocalDateTime.class), eq("CREDIT")))
                .thenReturn(null);
        when(creditRepository.getTotalExpectedAmountForActiveCredits()).thenReturn(250_000.0);

        // When
        CollectionMetricsDto metrics = biDashboardService.getCollectionMetrics(startDate, endDate);

        // Then
        assertEquals(0.0, metrics.getTotalCollected());
        assertEquals(0.0, metrics.getCollectionRate());
        assertEquals(0.0, metrics.getEvolution());
    }

    @Test
    void getPortfolioMetrics_mapsRepositoryAggregate() {
        // Given
        when(biCreditQueryRepository.getPortfolioMetrics())
                .thenReturn(portfolioProjection(2, 125_000.0, 50_000.0, 50_000.0, 0.0, 0.0));

        // When
        PortfolioMetricsDto metrics = biDashboardService.getPortfolioMetrics();

        // Then
        assertEquals(2, metrics.getActiveCreditsCount());
        assertEquals(125_000.0, metrics.getTotalOutstanding());
        assertEquals(50_000.0, metrics.getTotalOverdue());
    }

    @Test
    void getPortfolioMetrics_mapsParBucketsFromAggregate() {
        // Given
        when(biCreditQueryRepository.getPortfolioMetrics())
                .thenReturn(portfolioProjection(3, 225_000.0, 225_000.0, 225_000.0, 175_000.0, 100_000.0));

        // When
        PortfolioMetricsDto metrics = biDashboardService.getPortfolioMetrics();

        // Then
        assertEquals(225_000.0, metrics.getPar7());
        assertEquals(175_000.0, metrics.getPar15());
        assertEquals(100_000.0, metrics.getPar30());
    }

    @Test
    void getOverview_combinesAllDashboardMetricFamilies() {
        // Given
        when(biCreditQueryRepository.getSalesMetrics(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(salesProjection(1, 100_000.0, 20_000.0, 100_000.0));
        when(creditTimelineRepository.sumAmountByDateAndCreditType(
                any(LocalDateTime.class), any(LocalDateTime.class), eq("CREDIT")))
                .thenReturn(50_000.0);
        when(creditRepository.getTotalExpectedAmountForActiveCredits()).thenReturn(100_000.0);
        when(biCreditQueryRepository.getPortfolioMetrics())
                .thenReturn(portfolioProjection(1, 50_000.0, 0.0, 0.0, 0.0, 0.0));
        when(articlesService.getStockMetrics()).thenReturn(mock(StockMetricsDto.class));

        // When
        DashboardOverviewDto overview = biDashboardService.getOverview(startDate, endDate);

        // Then
        assertNotNull(overview.getSales());
        assertNotNull(overview.getCollections());
        assertNotNull(overview.getStock());
        assertNotNull(overview.getPortfolio());
    }

    private LocalDate previousStart() {
        return startDate.minusDays(java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate));
    }

    private LocalDate previousEnd() {
        return startDate.minusDays(1);
    }

    private SalesMetricsProjection salesProjection(int count, double totalAmount, double totalProfit, double average) {
        return new SalesMetricsProjection() {
            @Override
            public Integer getSalesCount() {
                return count;
            }

            @Override
            public Double getTotalAmount() {
                return totalAmount;
            }

            @Override
            public Double getTotalProfit() {
                return totalProfit;
            }

            @Override
            public Double getAvgAmount() {
                return average;
            }
        };
    }

    private PortfolioMetricsProjection portfolioProjection(int activeCount, double totalOutstanding,
            double totalOverdue, double par7, double par15, double par30) {
        return new PortfolioMetricsProjection() {
            @Override
            public Integer getActiveCount() {
                return activeCount;
            }

            @Override
            public Double getTotalOutstanding() {
                return totalOutstanding;
            }

            @Override
            public Double getTotalOverdue() {
                return totalOverdue;
            }

            @Override
            public Double getPar7() {
                return par7;
            }

            @Override
            public Double getPar15() {
                return par15;
            }

            @Override
            public Double getPar30() {
                return par30;
            }
        };
    }
}
