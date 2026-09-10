package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.TontineCollectionResetRunDto;
import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineCollectionResetRunStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetFileRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetRunRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.report.DailyTontineReportReconciler;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.AdditionalMatchers.aryEq;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineCollectionResetServiceTest {

    @Mock
    private TontineService tontineService;
    @Mock
    private UserService userService;
    @Mock
    private TontineCollectionRepository collectionRepository;
    @Mock
    private TontineMemberRepository memberRepository;
    @Mock
    private TontineSessionRepository sessionRepository;
    @Mock
    private DailyTontineReportReconciler dailyTontineReportReconciler;
    @Mock
    private TontineCollectionResetRunRepository runRepository;
    @Mock
    private TontineCollectionResetFileRepository fileRepository;
    @Mock
    private TontineCollectionResetPdfService pdfService;
    @Mock
    private MonthlyReportStorageService storageService;
    @InjectMocks
    private TontineCollectionResetService service;

    @Test
    void triggerReset_rejectsSessionThatIsNotActiveBeforeLoadingCollections() {
        TontineSession session = session(10L, 2026, TontineSessionStatus.CLOSED);
        when(tontineService.getActiveSession()).thenReturn(session);

        assertThrows(CustomValidationException.class, service::triggerReset);
        verify(collectionRepository, never()).findAllBySessionId(10L);
    }

    @Test
    void triggerReset_rejectsActiveSessionWithoutCollections() {
        TontineSession session = session(10L, 2026, TontineSessionStatus.ACTIVE);
        when(tontineService.getActiveSession()).thenReturn(session);
        when(collectionRepository.findAllBySessionId(10L)).thenReturn(List.of());

        assertThrows(CustomValidationException.class, service::triggerReset);
        verify(runRepository, never()).save(any());
    }

    @Test
    void triggerReset_archivesCollectionsReconcilesReportsAndResetsSession() {
        TontineSession session = session(10L, 2026, TontineSessionStatus.ACTIVE);
        LocalDateTime collectionDate = LocalDateTime.of(2026, 8, 10, 9, 30);
        LocalDateTime createdDate = LocalDateTime.of(2026, 9, 1, 14, 0);
        TontineCollection collection = collection("collector.a", 200_000.0, collectionDate, createdDate);
        User currentUser = org.mockito.Mockito.mock(User.class);
        when(currentUser.getUsername()).thenReturn("admin");
        when(tontineService.getActiveSession()).thenReturn(session);
        when(collectionRepository.findAllBySessionId(10L)).thenReturn(List.of(collection));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(runRepository.save(any(TontineCollectionResetRun.class))).thenAnswer(invocation -> {
            TontineCollectionResetRun run = invocation.getArgument(0);
            if (run.getId() == null) {
                run.setId(100L);
            }
            return run;
        });
        when(pdfService.generateArchivePdf(any(Integer.class), any(String.class), any(String.class),
                anyList()))
                .thenReturn(new byte[]{1, 2, 3});
        when(pdfService.buildFileName(2026, "collector.a", "T3"))
                .thenReturn("collectes-2026-collector-a-t3.pdf");
        when(pdfService.buildStorageKey(2026, 100L, "collector.a", "T3"))
                .thenReturn("tontine/2026/100/collector-a-t3.pdf");
        when(storageService.isAvailable()).thenReturn(true);
        when(storageService.getReportsBucket()).thenReturn("reports");
        when(memberRepository.resetContributionsBySessionId(10L)).thenReturn(4);

        TontineCollectionResetRunDto result = service.triggerReset();

        assertEquals(TontineCollectionResetRunStatus.COMPLETED, result.status());
        assertEquals(1, result.collectionsCount());
        assertEquals(200_000.0, result.collectionsAmount());
        assertEquals(4, result.membersResetCount());
        assertEquals(1, result.pdfFileCount());
        assertEquals(0.0, session.getTotalRevenue());
        verify(storageService).upload(eq("tontine/2026/100/collector-a-t3.pdf"), aryEq(new byte[]{1, 2, 3}));
        verify(fileRepository).save(any());
        verify(collectionRepository).deleteAllBySessionId(10L);
        verify(sessionRepository).save(session);
        verify(memberRepository).resetContributionsBySessionId(10L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<LocalDate>> datesCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(dailyTontineReportReconciler).reconcileAll(eq("collector.a"), datesCaptor.capture());
        Set<LocalDate> dates = Set.copyOf(datesCaptor.getValue());
        assertTrue(dates.contains(LocalDate.of(2026, 8, 10)));
        assertTrue(dates.contains(LocalDate.of(2026, 9, 1)));
    }

    private TontineSession session(Long id, int year, TontineSessionStatus status) {
        TontineSession session = new TontineSession();
        session.setId(id);
        session.setYear(year);
        session.setStatus(status);
        session.setTotalRevenue(450_000.0);
        return session;
    }

    private TontineCollection collection(String commercial, double amount,
            LocalDateTime collectionDate, LocalDateTime createdDate) {
        Client client = new Client();
        client.setFirstname("Client");
        client.setLastname("Tontine");
        client.setCode("CLT-001");
        client.setTontineCollector(commercial);
        client.setQuarter("T3");
        TontineMember member = new TontineMember();
        member.setClient(client);
        TontineCollection collection = new TontineCollection();
        collection.setTontineMember(member);
        collection.setAmount(amount);
        collection.setCollectionDate(collectionDate);
        collection.setCreatedDate(createdDate);
        collection.setCommercialUsername(commercial);
        collection.setReference("COL-2026-001");
        collection.setIsDeliveryCollection(false);
        return collection;
    }
}
