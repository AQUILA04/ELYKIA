package com.optimize.elykia.core.service.report;

import com.optimize.elykia.core.dto.report.CommercialYearlySummaryDto;
import com.optimize.elykia.core.entity.report.CommercialReportMonthly;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.CommercialReportMonthlyRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialReportMonthlyServiceTest {

    @Mock
    private CommercialReportMonthlyRepository monthlyRepository;
    @Mock
    private DailyCommercialReportRepository dailyReportRepository;
    @Mock
    private CommercialYearlyPortfolioService yearlyPortfolioService;
    @Mock
    private DailyCommercialReport firstDailyReport;
    @Mock
    private DailyCommercialReport secondDailyReport;
    @InjectMocks
    private CommercialReportMonthlyService service;
    @Captor
    private ArgumentCaptor<CommercialReportMonthly> monthlyCaptor;

    @Test
    void syncMonth_aggregatesDailyMetricsAndNormalizesMissingValues() {
        // Given
        LocalDate start = LocalDate.of(2026, 8, 1);
        LocalDate end = LocalDate.of(2026, 8, 31);
        CommercialReportMonthly existing = new CommercialReportMonthly();
        when(dailyReportRepository.findByCommercialUsernameAndDateBetweenOrderByDateAsc("collector.a", start, end))
                .thenReturn(List.of(firstDailyReport, secondDailyReport));
        when(firstDailyReport.getCreditSalesAmount()).thenReturn(100.0);
        when(firstDailyReport.getCreditSalesCount()).thenReturn(2);
        when(firstDailyReport.getCollectionsAmount()).thenReturn(50.0);
        when(firstDailyReport.getTotalAdvancesAmount()).thenReturn(10.0);
        when(firstDailyReport.getTotalCreditAmountDeposited()).thenReturn(20.0);
        when(secondDailyReport.getCreditSalesAmount()).thenReturn(null);
        when(secondDailyReport.getCreditSalesCount()).thenReturn(null);
        when(secondDailyReport.getCollectionsAmount()).thenReturn(25.0);
        when(secondDailyReport.getTotalAdvancesAmount()).thenReturn(null);
        when(secondDailyReport.getTotalCreditAmountDeposited()).thenReturn(30.0);
        when(monthlyRepository.findByCommercialUsernameAndYearAndMonth("collector.a", 2026, 8))
                .thenReturn(Optional.of(existing));

        // When
        service.syncMonth("collector.a", 2026, 8);

        // Then
        assertEquals(100.0, existing.getCreditSalesAmount());
        assertEquals(2, existing.getCreditSalesCount());
        assertEquals(75.0, existing.getCollectionsAmount());
        assertEquals(10.0, existing.getTotalAdvancesAmount());
        assertEquals(50.0, existing.getTotalCreditAmountDeposited());
        verify(monthlyRepository).save(existing);
    }

    @Test
    void syncMonth_createsMonthlyReportWhenItDoesNotExist() {
        // Given
        LocalDate start = LocalDate.of(2026, 2, 1);
        LocalDate end = LocalDate.of(2026, 2, 28);
        when(dailyReportRepository.findByCommercialUsernameAndDateBetweenOrderByDateAsc("collector.a", start, end))
                .thenReturn(List.of());
        when(monthlyRepository.findByCommercialUsernameAndYearAndMonth("collector.a", 2026, 2))
                .thenReturn(Optional.empty());

        // When
        service.syncMonth("collector.a", 2026, 2);

        // Then
        verify(monthlyRepository).save(monthlyCaptor.capture());
        CommercialReportMonthly created = monthlyCaptor.getValue();
        assertEquals("collector.a", created.getCommercialUsername());
        assertEquals(2026, created.getYear());
        assertEquals(2, created.getMonth());
        assertEquals(0.0, created.getCreditSalesAmount());
        assertEquals(0, created.getCreditSalesCount());
    }

    @Test
    void syncFromDailyReport_ignoresIncompleteInputAndSynchronizesValidReportMonth() {
        // Given
        DailyCommercialReport invalid = new DailyCommercialReport();
        DailyCommercialReport valid = new DailyCommercialReport();
        valid.setCommercialUsername("collector.a");
        valid.setDate(LocalDate.of(2026, 8, 15));
        when(dailyReportRepository.findByCommercialUsernameAndDateBetweenOrderByDateAsc(
                "collector.a", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31))).thenReturn(List.of());
        when(monthlyRepository.findByCommercialUsernameAndYearAndMonth("collector.a", 2026, 8))
                .thenReturn(Optional.of(new CommercialReportMonthly()));

        // When
        service.syncFromDailyReport(invalid);
        service.syncFromDailyReport(valid);

        // Then
        verify(dailyReportRepository).findByCommercialUsernameAndDateBetweenOrderByDateAsc(
                "collector.a", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));
        verify(monthlyRepository).save(org.mockito.ArgumentMatchers.any(CommercialReportMonthly.class));
    }

    @Test
    void getYearlySummary_delegatesToPortfolioService() {
        // Given
        CommercialYearlySummaryDto expected = org.mockito.Mockito.mock(CommercialYearlySummaryDto.class);
        when(yearlyPortfolioService.buildYearlySummary("collector.a", 2026)).thenReturn(expected);

        // When
        CommercialYearlySummaryDto result = service.getYearlySummary("collector.a", 2026);

        // Then
        assertSame(expected, result);
        verify(yearlyPortfolioService).buildYearlySummary("collector.a", 2026);
    }
}
