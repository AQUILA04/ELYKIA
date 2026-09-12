package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyTontineReportReconcilerTest {

    @Mock
    private TontineCollectionRepository tontineCollectionRepository;
    @Mock
    private DailyCommercialReportRepository dailyReportRepository;
    @Mock
    private DailyCommercialReportPersistence reportPersistence;

    @InjectMocks
    private DailyTontineReportReconciler reconciler;

    @Test
    void reconcile_rebuildsActivityAndToDepositFromCollectionDate() {
        LocalDate day = LocalDate.of(2026, 9, 10);
        LocalDateTime start = day.atStartOfDay();
        LocalDateTime end = day.plusDays(1).atStartOfDay();
        DailyCommercialReport report = new DailyCommercialReport();
        report.setCommercialUsername("COM003");
        report.setDate(day);
        report.setTontineCollectionsAmount(9999.0);
        report.setTontineCollectionsCount(99);
        report.setTotalAdvancesAmount(1000.0);
        report.setCollectionsAmount(2000.0);
        report.setNewAccountsBalance(500.0);
        report.setTotalAmountToDeposit(50_000.0);
        report.setTontineCatchupAmount(888.0);
        report.setTontineCatchupCount(8);

        when(tontineCollectionRepository.sumByCommercialAndCollectionDate(
                eq("COM003"), eq(State.ENABLED), eq(start), eq(end)))
                .thenReturn(List.<Object[]>of(new Object[]{4500.0, 3L}));
        when(tontineCollectionRepository.sumCatchupByCommercialAndCreatedDate(
                eq("COM003"), eq(State.ENABLED), eq(start), eq(end)))
                .thenReturn(List.<Object[]>of(new Object[]{0.0, 0L}));
        when(dailyReportRepository.findByDateAndCommercialUsername(day, "COM003"))
                .thenReturn(Optional.of(report));
        when(reportPersistence.save(any())).thenAnswer(inv -> inv.getArgument(0));

        reconciler.reconcile("COM003", day);

        assertEquals(4500.0, report.getTontineCollectionsAmount());
        assertEquals(3, report.getTontineCollectionsCount());
        assertEquals(0.0, report.getTontineCatchupAmount());
        assertEquals(0, report.getTontineCatchupCount());
        // creditToDeposit=1000+2000 + newBalance=500 + activity=4500
        assertEquals(8_000.0, report.getTotalAmountToDeposit());
        verify(reportPersistence).save(report);
    }

    @Test
    void reconcile_rebuildsCatchupCountersFromCreatedDate() {
        LocalDate captureDay = LocalDate.of(2026, 9, 10);
        LocalDateTime start = captureDay.atStartOfDay();
        LocalDateTime end = captureDay.plusDays(1).atStartOfDay();
        DailyCommercialReport report = new DailyCommercialReport();
        report.setCommercialUsername("COM003");
        report.setDate(captureDay);
        report.setTontineCollectionsAmount(0.0);
        report.setTontineCollectionsCount(0);
        report.setTotalAdvancesAmount(0.0);
        report.setCollectionsAmount(0.0);
        report.setNewAccountsBalance(0.0);
        report.setTotalAmountToDeposit(0.0);

        when(tontineCollectionRepository.sumByCommercialAndCollectionDate(
                eq("COM003"), eq(State.ENABLED), eq(start), eq(end)))
                .thenReturn(List.<Object[]>of(new Object[]{0.0, 0L}));
        when(tontineCollectionRepository.sumCatchupByCommercialAndCreatedDate(
                eq("COM003"), eq(State.ENABLED), eq(start), eq(end)))
                .thenReturn(List.<Object[]>of(new Object[]{4200.0, 2L}));
        when(dailyReportRepository.findByDateAndCommercialUsername(captureDay, "COM003"))
                .thenReturn(Optional.of(report));
        when(reportPersistence.save(any())).thenAnswer(inv -> inv.getArgument(0));

        reconciler.reconcile("COM003", captureDay);

        assertEquals(4200.0, report.getTontineCatchupAmount());
        assertEquals(2, report.getTontineCatchupCount());
        assertEquals(0.0, report.getTotalAmountToDeposit());
        verify(reportPersistence).save(report);
    }

    @Test
    void reconcileAll_callsEachDistinctDate() {
        LocalDate d1 = LocalDate.of(2026, 8, 1);
        LocalDate d2 = LocalDate.of(2026, 9, 10);
        when(tontineCollectionRepository.sumByCommercialAndCollectionDate(any(), any(), any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{0.0, 0L}));
        when(tontineCollectionRepository.sumCatchupByCommercialAndCreatedDate(any(), any(), any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{0.0, 0L}));
        when(dailyReportRepository.findByDateAndCommercialUsername(any(), eq("COM003")))
                .thenReturn(Optional.empty());

        reconciler.reconcileAll("COM003", List.of(d1, d2, d1));

        verify(dailyReportRepository).findByDateAndCommercialUsername(d1, "COM003");
        verify(dailyReportRepository).findByDateAndCommercialUsername(d2, "COM003");
    }
}
