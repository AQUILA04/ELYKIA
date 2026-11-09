package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.TontineCollectionResetRunDto;
import com.optimize.elykia.core.entity.report.TontineCollectionResetLine;
import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.TontineCollectionResetRunStatus;
import com.optimize.elykia.core.enumaration.TontineCollectionResetScope;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineCatchupNotificationRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetFileRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetLineRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetRunRepository;
import com.optimize.elykia.core.repository.TontineCommercialCollectionVoidStore;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.repository.notification.AppNotificationRepository;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.service.report.DailyTontineReportReconciler;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.AdditionalMatchers.aryEq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineCommercialCollectionVoidServiceTest {

    @Mock
    private TontineService tontineService;
    @Mock
    private TontineAllocationMigrationService allocationMigrationService;
    @Mock
    private UserService userService;
    @Mock
    private TontineSessionRepository sessionRepository;
    @Mock
    private TontineCollectionResetRunRepository runRepository;
    @Mock
    private TontineCollectionResetFileRepository fileRepository;
    @Mock
    private TontineCollectionResetLineRepository lineRepository;
    @Mock
    private TontineCommercialCollectionVoidStore store;
    @Mock
    private DailyTontineReportReconciler dailyTontineReportReconciler;
    @Mock
    private DailyOperationService dailyOperationService;
    @Mock
    private AppNotificationRepository appNotificationRepository;
    @Mock
    private TontineCatchupNotificationRepository catchupNotificationRepository;
    @Mock
    private TontineCollectionResetPdfService pdfService;
    @Mock
    private MonthlyReportStorageService storageService;
    @Mock
    private EntityManager entityManager;

    private TontineCommercialCollectionVoidService service;

    @BeforeEach
    void setUp() {
        service = new TontineCommercialCollectionVoidService(
                tontineService,
                allocationMigrationService,
                userService,
                sessionRepository,
                runRepository,
                fileRepository,
                lineRepository,
                store,
                dailyTontineReportReconciler,
                dailyOperationService,
                appNotificationRepository,
                catchupNotificationRepository,
                pdfService,
                storageService,
                entityManager);
    }

    @Test
    void voidCommercial_archivesAliceReplaysSharedMemberAndLeavesBobUntouched() {
        TontineSession session = session(10L, 2026, TontineSessionStatus.ACTIVE);
        User admin = org.mockito.Mockito.mock(User.class);
        when(admin.getUsername()).thenReturn("admin");
        when(tontineService.getActiveSession()).thenReturn(session);
        when(sessionRepository.lockById(10L)).thenReturn(Optional.of(session));
        when(runRepository.existsBySessionIdAndStatusIn(eq(10L), any())).thenReturn(false);
        when(store.preview(10L, "alice")).thenReturn(new TontineCommercialCollectionVoidStore.Preview(
                2, 1_500, 1, 1, 800, 0, 2));
        when(userService.getCurrentUser()).thenReturn(admin);
        AtomicReference<TontineCollectionResetRun> saved = new AtomicReference<>();
        when(runRepository.save(any(TontineCollectionResetRun.class))).thenAnswer(invocation -> {
            TontineCollectionResetRun run = invocation.getArgument(0);
            if (run.getId() == null) {
                run.setId(100L);
            }
            saved.set(run);
            return run;
        });
        when(store.insertLines(100L, 10L, "alice", "admin")).thenReturn(2);
        when(store.insertMembers(100L, 10L, "alice", "admin")).thenReturn(1);
        when(store.dominantCommercialUsername(100L)).thenReturn("alice");
        when(store.sumLineAmount(100L)).thenReturn(1_500.0);
        when(store.findMemberIds(100L)).thenReturn(List.of(7L));
        when(store.findReportDates(100L)).thenReturn(List.of(
                LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 3)));
        when(store.findCollectionIds(100L)).thenReturn(List.of(11L, 12L));
        when(runRepository.findById(100L)).thenAnswer(invocation -> Optional.of(saved.get()));
        TontineCollectionResetLine archived = new TontineCollectionResetLine();
        archived.setClientName("Client partagé");
        archived.setClientCode("C1");
        archived.setQuarter("Tokoin");
        archived.setAmount(1_500.0);
        archived.setCollectionDate(LocalDateTime.of(2026, 3, 2, 8, 0));
        archived.setCommercialUsername("alice");
        archived.setReference("REF-A");
        when(lineRepository.findByRun_IdOrderByQuarterAscCollectionDateAscIdAsc(100L)).thenReturn(List.of(archived));
        when(pdfService.generateArchivePdf(eq(2026), eq("alice"), eq("Tokoin"), anyList())).thenReturn(new byte[]{1});
        when(pdfService.buildFileName(2026, "alice", "Tokoin")).thenReturn("alice-tokoin.pdf");
        when(pdfService.buildStorageKey(2026, 100L, "alice", "Tokoin")).thenReturn("key/alice.pdf");
        when(storageService.isAvailable()).thenReturn(true);
        when(storageService.getReportsBucket()).thenReturn("reports");

        TontineCollectionResetRunDto result = service.voidCommercial("alice", null);

        assertEquals(TontineCollectionResetRunStatus.COMPLETED, result.status());
        assertEquals(TontineCollectionResetScope.COMMERCIAL, result.scope());
        assertEquals("alice", result.targetCommercialUsername());
        assertEquals(2, result.collectionsCount());
        assertEquals(1_500.0, result.collectionsAmount());
        assertEquals(1, result.membersResetCount());
        assertEquals(1, result.pdfFileCount());
        verify(store).softDelete(10L, "alice", "admin");
        verify(store, never()).softDelete(eq(10L), eq("bob"), any());
        verify(tontineService).replayMembersFromEnabledCollections(List.of(7L));
        verify(tontineService).refreshSessionRevenue(10L);
        verify(storageService).upload(eq("key/alice.pdf"), aryEq(new byte[]{1}));
        verify(fileRepository).save(any());
        verify(appNotificationRepository).cancelUnresolvedByTypeAndEntityIds(
                eq(AppNotificationType.TONTINE_CATCHUP), eq(List.of(11L, 12L)), any());
        verify(catchupNotificationRepository).cancelByCollectionIds(List.of(11L, 12L));
        verify(dailyOperationService).logOperationInCurrentTransaction(
                eq("alice"),
                eq(OperationType.TONTINE_COLLECTION_CANCEL),
                eq(-1_500.0),
                eq("Annulation collectes commercial"),
                any(),
                eq(0.0),
                eq(0.0),
                any());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<LocalDate>> datesCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(dailyTontineReportReconciler).reconcileAll(eq("alice"), datesCaptor.capture());
        assertEquals(Set.of(LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 3)), Set.copyOf(datesCaptor.getValue()));
        verify(dailyTontineReportReconciler, never()).reconcileAll(eq("bob"), any());
    }

    @Test
    void voidCommercial_refusesWhenThisCommercialHasNothingLeft() {
        TontineSession session = session(10L, 2026, TontineSessionStatus.ACTIVE);
        when(tontineService.getActiveSession()).thenReturn(session);
        when(sessionRepository.lockById(10L)).thenReturn(Optional.of(session));
        when(runRepository.existsBySessionIdAndStatusIn(eq(10L), any())).thenReturn(false);
        when(store.preview(10L, "alice")).thenReturn(new TontineCommercialCollectionVoidStore.Preview(
                0, 0, 0, 0, 0, 0, 0));

        assertThrows(CustomValidationException.class, () -> service.voidCommercial(" alice ", null));
        verify(runRepository, never()).save(any());
        verify(store, never()).softDelete(any(), any(), any());
        verify(tontineService, never()).replayMembersFromEnabledCollections(any());
    }

    @Test
    void voidCommercial_refusesClosedSessionAndBusyRun() {
        TontineSession closed = session(10L, 2026, TontineSessionStatus.CLOSED);
        when(sessionRepository.findByYear(2026)).thenReturn(Optional.of(closed));

        assertThrows(CustomValidationException.class, () -> service.voidCommercial("alice", 2026));
        verify(sessionRepository, never()).lockById(any());

        TontineSession active = session(10L, 2026, TontineSessionStatus.ACTIVE);
        when(tontineService.getActiveSession()).thenReturn(active);
        when(sessionRepository.lockById(10L)).thenReturn(Optional.of(active));
        when(runRepository.existsBySessionIdAndStatusIn(eq(10L), any())).thenReturn(true);

        assertThrows(CustomValidationException.class, () -> service.voidCommercial("alice", null));
        verify(store, never()).preview(any(), any());
    }

    private static TontineSession session(Long id, int year, TontineSessionStatus status) {
        TontineSession session = new TontineSession();
        session.setId(id);
        session.setYear(year);
        session.setStatus(status);
        return session;
    }
}
