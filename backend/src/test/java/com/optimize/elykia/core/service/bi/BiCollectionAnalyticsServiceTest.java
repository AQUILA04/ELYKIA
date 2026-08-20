package com.optimize.elykia.core.service.bi;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.bi.CollectionTrendDto;
import com.optimize.elykia.core.dto.bi.OverdueAnalysisDto;
import com.optimize.elykia.core.dto.bi.OverdueRangeProjection;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiCollectionAnalyticsServiceTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CreditTimelineRepository timelineRepository;
    @Mock private Credit firstCredit;
    @Mock private Credit secondCredit;
    @Mock private OverdueRangeProjection earlyOverdue;
    @Mock private OverdueRangeProjection lateOverdue;

    @Test
    void getCollectionTrends_reusesExpectedDailyStakeAndNormalizesMissingCollectionForEveryDate() {
        // Given
        BiCollectionAnalyticsService service = new BiCollectionAnalyticsService(creditRepository, timelineRepository);
        LocalDate start = LocalDate.of(2026, 8, 18);
        LocalDate end = LocalDate.of(2026, 8, 19);
        when(firstCredit.getDailyStake()).thenReturn(1_000.0);
        when(secondCredit.getDailyStake()).thenReturn(500.0);
        when(creditRepository.findByStatusAndClientType(CreditStatus.INPROGRESS, ClientType.CLIENT))
                .thenReturn(List.of(firstCredit, secondCredit));
        when(timelineRepository.sumAmountByDateAndCreditType(
                start.atStartOfDay(), start.atTime(23, 59, 59), "CREDIT")).thenReturn(750.0);
        when(timelineRepository.sumAmountByDateAndCreditType(
                end.atStartOfDay(), end.atTime(23, 59, 59), "CREDIT")).thenReturn(null);

        // When
        List<CollectionTrendDto> trends = service.getCollectionTrends(start, end);

        // Then
        assertEquals(2, trends.size());
        assertEquals(start, trends.get(0).getDate());
        assertEquals(750.0, trends.get(0).getCollected());
        assertEquals(1_500.0, trends.get(0).getExpected());
        assertEquals(50.0, trends.get(0).getCollectionRate());
        assertEquals(end, trends.get(1).getDate());
        assertEquals(0.0, trends.get(1).getCollected());
        assertEquals(0.0, trends.get(1).getCollectionRate());
    }

    @Test
    void getOverdueAnalysis_calculatesEachRangeShareFromTotalOutstandingDebt() {
        // Given
        BiCollectionAnalyticsService service = new BiCollectionAnalyticsService(creditRepository, timelineRepository);
        when(earlyOverdue.getRange()).thenReturn("1-7 jours");
        when(earlyOverdue.getCreditsCount()).thenReturn(2);
        when(earlyOverdue.getTotalAmount()).thenReturn(4_000.0);
        when(lateOverdue.getRange()).thenReturn("30+ jours");
        when(lateOverdue.getCreditsCount()).thenReturn(1);
        when(lateOverdue.getTotalAmount()).thenReturn(6_000.0);
        when(creditRepository.getOverdueAnalysis()).thenReturn(List.of(earlyOverdue, lateOverdue));

        // When
        List<OverdueAnalysisDto> analysis = service.getOverdueAnalysis();

        // Then
        assertEquals(2, analysis.size());
        assertEquals("1-7 jours", analysis.get(0).getRange());
        assertEquals(2, analysis.get(0).getCreditsCount());
        assertEquals(4_000.0, analysis.get(0).getTotalAmount());
        assertEquals(40.0, analysis.get(0).getPercentage());
        assertEquals("30+ jours", analysis.get(1).getRange());
        assertEquals(60.0, analysis.get(1).getPercentage());
    }
}
