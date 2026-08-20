package com.optimize.elykia.core.service.commercial;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.entity.bi.CommercialPerformance;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.RiskLevel;
import com.optimize.elykia.core.repository.CommercialPerformanceRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialPerformanceServiceTest {

    @Mock
    private CommercialPerformanceRepository performanceRepository;
    @Mock
    private CreditRepository creditRepository;
    @Mock
    private CreditTimelineRepository timelineRepository;
    @Mock
    private Credit firstSale;
    @Mock
    private Credit secondSale;
    @Mock
    private Credit overdueCriticalCredit;
    @Mock
    private Credit futureStandardCredit;
    @InjectMocks
    private CommercialPerformanceService service;

    @Test
    void calculatePerformance_aggregatesSalesCollectionsAndPortfolioRisk() {
        // Given
        LocalDate start = LocalDate.of(2026, 8, 1);
        LocalDate end = LocalDate.of(2026, 8, 31);
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(23, 59, 59);
        when(performanceRepository.findByCollectorAndPeriodStartAndPeriodEnd("collector.a", start, end))
                .thenReturn(Optional.empty());
        when(creditRepository.findByCollectorAndAccountingDateBetweenAndClientType(
                "collector.a", start, end, ClientType.CLIENT)).thenReturn(List.of(firstSale, secondSale));
        when(firstSale.getTotalAmount()).thenReturn(100.0);
        when(firstSale.getTotalPurchase()).thenReturn(40.0);
        when(secondSale.getTotalAmount()).thenReturn(200.0);
        when(secondSale.getTotalPurchase()).thenReturn(120.0);
        when(timelineRepository.sumAmountByCollectorAndDate("collector.a", startDateTime, endDateTime)).thenReturn(60.0);
        when(creditRepository.findByCollectorAndStatusAndClientType(
                "collector.a", CreditStatus.INPROGRESS, ClientType.CLIENT))
                .thenReturn(List.of(overdueCriticalCredit, futureStandardCredit));
        when(overdueCriticalCredit.getClientId()).thenReturn(1L);
        when(overdueCriticalCredit.getExpectedEndDate()).thenReturn(LocalDate.now().minusDays(1));
        when(overdueCriticalCredit.getTotalAmountRemaining()).thenReturn(40.0);
        when(overdueCriticalCredit.getRiskLevel()).thenReturn(RiskLevel.CRITICAL);
        when(futureStandardCredit.getClientId()).thenReturn(1L);
        when(futureStandardCredit.getExpectedEndDate()).thenReturn(LocalDate.now().plusDays(1));
        when(futureStandardCredit.getRiskLevel()).thenReturn(RiskLevel.LOW);
        when(performanceRepository.save(any(CommercialPerformance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CommercialPerformance result = service.calculatePerformance("collector.a", start, end);

        // Then
        assertEquals("collector.a", result.getCollector());
        assertEquals(2, result.getTotalSalesCount());
        assertEquals(300.0, result.getTotalSalesAmount());
        assertEquals(140.0, result.getTotalProfit());
        assertEquals(150.0, result.getAverageSaleAmount());
        assertEquals(60.0, result.getTotalCollected());
        assertEquals(20.0, result.getCollectionRate());
        assertEquals(1, result.getActiveClientsCount());
        assertEquals(40.0, result.getPortfolioAtRisk());
        assertEquals(1, result.getCriticalAccountsCount());
        verify(performanceRepository).save(result);
    }

    @Test
    void calculatePerformance_resetsAverageAndCollectionRateWhenExistingPeriodHasNoSale() {
        // Given
        LocalDate start = LocalDate.of(2026, 8, 1);
        LocalDate end = LocalDate.of(2026, 8, 31);
        CommercialPerformance existing = new CommercialPerformance();
        existing.setAverageSaleAmount(80.0);
        existing.setCollectionRate(60.0);
        when(performanceRepository.findByCollectorAndPeriodStartAndPeriodEnd("collector.a", start, end))
                .thenReturn(Optional.of(existing));
        when(creditRepository.findByCollectorAndAccountingDateBetweenAndClientType(
                "collector.a", start, end, ClientType.CLIENT)).thenReturn(List.of());
        when(timelineRepository.sumAmountByCollectorAndDate(
                "collector.a", start.atStartOfDay(), end.atTime(23, 59, 59))).thenReturn(null);
        when(creditRepository.findByCollectorAndStatusAndClientType(
                "collector.a", CreditStatus.INPROGRESS, ClientType.CLIENT)).thenReturn(List.of());
        when(performanceRepository.save(existing)).thenReturn(existing);

        // When
        CommercialPerformance result = service.calculatePerformance("collector.a", start, end);

        // Then
        assertSame(existing, result);
        assertEquals(0.0, result.getTotalSalesAmount());
        assertEquals(0.0, result.getAverageSaleAmount());
        assertEquals(0.0, result.getTotalCollected());
        assertEquals(0.0, result.getCollectionRate());
    }
}
