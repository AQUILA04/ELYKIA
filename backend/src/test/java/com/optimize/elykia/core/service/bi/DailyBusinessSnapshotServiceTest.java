package com.optimize.elykia.core.service.bi;

import com.optimize.elykia.core.dto.bi.PortfolioMetricsProjection;
import com.optimize.elykia.core.dto.bi.SalesMetricsProjection;
import com.optimize.elykia.core.entity.bi.DailyBusinessSnapshot;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.DailyBusinessSnapshotRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyBusinessSnapshotServiceTest {

    @Mock private DailyBusinessSnapshotRepository snapshotRepository;
    @Mock private CreditRepository creditRepository;
    @Mock private CreditTimelineRepository timelineRepository;
    @Mock private ArticlesService articlesService;
    @Mock private ArticlesRepository articlesRepository;
    @Mock private SalesMetricsProjection salesMetrics;
    @Mock private PortfolioMetricsProjection portfolioMetrics;

    @Test
    void generateSnapshot_persistsAllOperationalAggregatesForTheRequestedDate() {
        // Given
        DailyBusinessSnapshotService service = service();
        LocalDate date = LocalDate.of(2026, 8, 19);
        DailyBusinessSnapshot snapshot = new DailyBusinessSnapshot();
        when(snapshotRepository.findBySnapshotDate(date)).thenReturn(Optional.of(snapshot));
        when(creditRepository.getDailySalesMetricsForAccountingDate(date)).thenReturn(salesMetrics);
        when(salesMetrics.getSalesCount()).thenReturn(3);
        when(salesMetrics.getTotalAmount()).thenReturn(32_000.0);
        when(salesMetrics.getTotalProfit()).thenReturn(9_500.0);
        when(timelineRepository.sumAmountByDate(date.atStartOfDay(), date.atTime(23, 59, 59))).thenReturn(14_000.0);
        when(articlesService.getDetailedStockValues()).thenReturn(Map.of("purchaseTotal", 75_000.0));
        when(articlesService.getRepository()).thenReturn(articlesRepository);
        when(articlesRepository.countByStockQuantityEquals(0)).thenReturn(4L);
        when(articlesService.countLowStockItems()).thenReturn(7L);
        when(creditRepository.getPortfolioMetricsAsOf(date)).thenReturn(portfolioMetrics);
        when(portfolioMetrics.getActiveCount()).thenReturn(12);
        when(portfolioMetrics.getTotalOutstanding()).thenReturn(58_000.0);
        when(portfolioMetrics.getTotalOverdue()).thenReturn(6_000.0);
        when(creditRepository.sumExpectedDailyCollection()).thenReturn(8_000.0);
        when(snapshotRepository.save(snapshot)).thenReturn(snapshot);

        // When
        DailyBusinessSnapshot returned = service.generateSnapshot(date);

        // Then
        assertEquals(snapshot, returned);
        assertEquals(date, snapshot.getSnapshotDate());
        assertEquals(3, snapshot.getNewCreditsCount());
        assertEquals(32_000.0, snapshot.getNewCreditsTotalAmount());
        assertEquals(9_500.0, snapshot.getNewCreditsProfit());
        assertEquals(14_000.0, snapshot.getDailyCollections());
        assertEquals(75_000.0, snapshot.getTotalStockValue());
        assertEquals(4, snapshot.getOutOfStockItemsCount());
        assertEquals(7, snapshot.getLowStockItemsCount());
        assertEquals(12, snapshot.getActiveCreditsCount());
        assertEquals(58_000.0, snapshot.getTotalOutstandingAmount());
        assertEquals(6_000.0, snapshot.getTotalOverdueAmount());
        assertEquals(8_000.0, snapshot.getExpectedDailyCollection());
    }

    @Test
    void generateSnapshot_normalizesAbsentAggregateSourcesToZeroInsteadOfPersistingNulls() {
        // Given
        DailyBusinessSnapshotService service = service();
        LocalDate date = LocalDate.of(2026, 8, 19);
        when(snapshotRepository.findBySnapshotDate(date)).thenReturn(Optional.empty());
        when(creditRepository.getDailySalesMetricsForAccountingDate(date)).thenReturn(null);
        when(timelineRepository.sumAmountByDate(date.atStartOfDay(), date.atTime(23, 59, 59))).thenReturn(null);
        when(articlesService.getDetailedStockValues()).thenReturn(Map.of());
        when(articlesService.getRepository()).thenReturn(articlesRepository);
        when(articlesRepository.countByStockQuantityEquals(0)).thenReturn(0L);
        when(articlesService.countLowStockItems()).thenReturn(0L);
        when(creditRepository.getPortfolioMetricsAsOf(date)).thenReturn(null);
        when(creditRepository.sumExpectedDailyCollection()).thenReturn(null);
        when(snapshotRepository.save(any(DailyBusinessSnapshot.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        DailyBusinessSnapshot snapshot = service.generateSnapshot(date);

        // Then
        assertEquals(0, snapshot.getNewCreditsCount());
        assertEquals(0.0, snapshot.getNewCreditsTotalAmount());
        assertEquals(0.0, snapshot.getNewCreditsProfit());
        assertEquals(0.0, snapshot.getDailyCollections());
        assertEquals(0.0, snapshot.getTotalStockValue());
        assertEquals(0, snapshot.getActiveCreditsCount());
        assertEquals(0.0, snapshot.getTotalOutstandingAmount());
        assertEquals(0.0, snapshot.getTotalOverdueAmount());
        assertEquals(0.0, snapshot.getExpectedDailyCollection());
    }

    private DailyBusinessSnapshotService service() {
        return new DailyBusinessSnapshotService(snapshotRepository, snapshotRepository,
                creditRepository, timelineRepository, articlesService);
    }
}
