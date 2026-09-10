package com.optimize.elykia.core.listener;

import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.event.TontineCollectionCancelledEvent;
import com.optimize.elykia.core.event.TontineCollectionEvent;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.service.report.DailyCommercialReportPersistence;
import com.optimize.elykia.core.service.report.DailyOperationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyReportEventListenerTontineTest {

    @Mock
    private DailyCommercialReportRepository repository;
    @Mock
    private DailyCommercialReportPersistence reportPersistence;
    @Mock
    private DailyOperationService dailyOperationService;

    @InjectMocks
    private DailyReportEventListener listener;

    @Test
    void handleTontineCollection_liveSameDay_updatesActivityAndToDepositOnSameReport() {
        LocalDate today = LocalDate.of(2026, 9, 10);
        DailyCommercialReport report = report("COM003", today, 1000.0, 1, 5000.0);
        when(repository.findByDateAndCommercialUsername(today, "COM003")).thenReturn(Optional.of(report));
        when(reportPersistence.save(any())).thenAnswer(inv -> inv.getArgument(0));

        listener.handleTontineCollection(new TontineCollectionEvent(
                this, 2500.0, "COM003", "Client A", today, today));

        assertEquals(2, report.getTontineCollectionsCount());
        assertEquals(3500.0, report.getTontineCollectionsAmount());
        assertEquals(7500.0, report.getTotalAmountToDeposit());
        verify(reportPersistence).save(report);
        verify(dailyOperationService).logOperation(
                eq("COM003"), eq(OperationType.TONTINE_COLLECTION), eq(2500.0),
                eq("Collecte Tontine"), any(), eq(0.0), eq(0.0), eq(today));
    }

    @Test
    void handleTontineCollection_catchup_putsActivityOnOperationDateAndCashOnCaptureDate() {
        LocalDate operationDate = LocalDate.of(2026, 8, 1);
        LocalDate captureDate = LocalDate.of(2026, 9, 10);
        DailyCommercialReport activity = report("COM003", operationDate, 0.0, 0, 0.0);
        DailyCommercialReport capture = report("COM003", captureDate, 100.0, 1, 200.0);

        when(repository.findByDateAndCommercialUsername(operationDate, "COM003"))
                .thenReturn(Optional.of(activity));
        when(repository.findByDateAndCommercialUsername(captureDate, "COM003"))
                .thenReturn(Optional.of(capture));
        when(reportPersistence.save(any())).thenAnswer(inv -> inv.getArgument(0));

        listener.handleTontineCollection(new TontineCollectionEvent(
                this, 3000.0, "COM003", "Client B", operationDate, captureDate));

        assertEquals(1, activity.getTontineCollectionsCount());
        assertEquals(3000.0, activity.getTontineCollectionsAmount());
        assertEquals(0.0, activity.getTotalAmountToDeposit());
        assertEquals(1, capture.getTontineCollectionsCount());
        assertEquals(100.0, capture.getTontineCollectionsAmount());
        assertEquals(3200.0, capture.getTotalAmountToDeposit());
        verify(reportPersistence).save(activity);
        verify(reportPersistence).save(capture);
    }

    @Test
    void handleTontineCollection_usesPersistedCommercialUsernameNotClientCollector() {
        LocalDate day = LocalDate.of(2026, 9, 10);
        DailyCommercialReport report = report("COM_OPERATOR", day, 0.0, 0, 0.0);
        when(repository.findByDateAndCommercialUsername(day, "COM_OPERATOR"))
                .thenReturn(Optional.of(report));
        when(reportPersistence.save(any())).thenAnswer(inv -> inv.getArgument(0));

        listener.handleTontineCollection(new TontineCollectionEvent(
                this, 1500.0, "COM_OPERATOR", "Client C", day, day));

        ArgumentCaptor<String> commercialCaptor = ArgumentCaptor.forClass(String.class);
        verify(repository).findByDateAndCommercialUsername(eq(day), commercialCaptor.capture());
        assertEquals("COM_OPERATOR", commercialCaptor.getValue());
        verify(repository, never()).findByDateAndCommercialUsername(eq(day), eq("CLIENT_COLLECTOR"));
    }

    @Test
    void handleTontineCollectionCancelled_onlyLogsOperationOnOperationDate() {
        LocalDate operationDate = LocalDate.of(2026, 8, 1);
        LocalDate captureDate = LocalDate.of(2026, 9, 10);

        listener.handleTontineCollectionCancelled(new TontineCollectionCancelledEvent(
                this, 3000.0, "COM003", "Client B", "COL-1", operationDate, captureDate));

        verify(dailyOperationService).logOperation(
                eq("COM003"), eq(OperationType.TONTINE_COLLECTION_CANCEL), eq(-3000.0),
                eq("Annulation Collecte Tontine"), any(), eq(0.0), eq(0.0), eq(operationDate));
        verify(repository, never()).findByDateAndCommercialUsername(any(), any());
        verify(reportPersistence, never()).save(any());
    }

    private static DailyCommercialReport report(String commercial, LocalDate date,
            double tontineAmount, int tontineCount, double toDeposit) {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setCommercialUsername(commercial);
        report.setDate(date);
        report.setTontineCollectionsAmount(tontineAmount);
        report.setTontineCollectionsCount(tontineCount);
        report.setTotalAmountToDeposit(toDeposit);
        return report;
    }
}
