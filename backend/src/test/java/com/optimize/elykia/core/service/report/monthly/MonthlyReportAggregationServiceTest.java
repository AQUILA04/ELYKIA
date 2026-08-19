package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonthlyReportAggregationServiceTest {

    @Mock
    private EntityManager entityManager;
    @Mock
    private DailyCommercialReportRepository dailyCommercialReportRepository;
    @Mock
    private CreditRepository creditRepository;
    @Mock
    private CommercialStockMovementRepository commercialStockMovementRepository;
    @Mock
    private MonthlyReportMarginCalculator marginCalculator;
    @Mock
    private DailyCommercialReport dailyReport;
    @Mock
    private CommercialStockMovement movement;
    @InjectMocks
    private MonthlyReportAggregationService service;

    @Test
    void aggregateCommercial_collectsDailyReportsAndStockMovementsForExactMonth() {
        // Given
        LocalDate start = LocalDate.of(2026, 8, 1);
        LocalDate end = LocalDate.of(2026, 8, 31);
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(23, 59, 59);
        List<DailyCommercialReport> daily = List.of(dailyReport);
        List<CommercialStockMovement> movements = List.of(movement);
        when(dailyCommercialReportRepository.findByCommercialUsernameAndDateBetweenOrderByDateAsc(
                "collector.a", start, end)).thenReturn(daily);
        when(commercialStockMovementRepository.findTimelineByCollector(
                "collector.a", startDateTime, endDateTime)).thenReturn(movements);

        // When
        Map<String, Object> result = service.aggregateCommercial(2026, 8, "collector.a");

        // Then
        assertEquals(2026, result.get("year"));
        assertEquals(8, result.get("month"));
        assertEquals("collector.a", result.get("commercialUsername"));
        assertSame(daily, result.get("dailySummary"));
        assertSame(movements, result.get("movements"));
        verify(dailyCommercialReportRepository).findByCommercialUsernameAndDateBetweenOrderByDateAsc(
                "collector.a", start, end);
        verify(commercialStockMovementRepository).findTimelineByCollector(
                "collector.a", startDateTime, endDateTime);
    }

    @Test
    void listActiveCommercials_mergesDeduplicatesSortsAndRemovesNullUsernames() {
        // Given
        DailyCommercialReport collectorB = org.mockito.Mockito.mock(DailyCommercialReport.class);
        DailyCommercialReport collectorA = org.mockito.Mockito.mock(DailyCommercialReport.class);
        DailyCommercialReport nullCollector = org.mockito.Mockito.mock(DailyCommercialReport.class);
        when(collectorB.getCommercialUsername()).thenReturn("collector.b");
        when(collectorA.getCommercialUsername()).thenReturn("collector.a");
        when(nullCollector.getCommercialUsername()).thenReturn(null);
        when(dailyCommercialReportRepository.findAggregatedByDateBetween(
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28)))
                .thenReturn(List.of(collectorB, collectorA, nullCollector));
        when(creditRepository.findDistinctCollectors())
                .thenReturn(Arrays.asList("collector.a", "collector.c", null));

        // When
        List<String> result = service.listActiveCommercials(2026, 2);

        // Then
        assertEquals(List.of("collector.a", "collector.b", "collector.c"), result);
    }
}
