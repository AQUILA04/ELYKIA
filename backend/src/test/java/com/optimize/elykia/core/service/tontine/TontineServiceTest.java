package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.TontineCollectionDto;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.event.TontineCollectionCancelledEvent;
import com.optimize.elykia.core.event.TontineCollectionEvent;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.report.DailyTontineReportReconciler;
import com.optimize.elykia.core.service.tontine.allocation.TontineAllocationPolicy;
import com.optimize.elykia.core.service.tontine.allocation.TontineAllocationPolicyResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineServiceTest {

    @Mock
    private TontineMemberRepository tontineMemberRepository;
    @Mock
    private TontineSessionRepository tontineSessionRepository;
    @Mock
    private TontineCollectionRepository tontineCollectionRepository;
    @Mock
    private ClientService clientService;
    @Mock
    private UserService userService;
    @Mock
    private ParameterService parameterService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private TontineAllocationPolicyResolver allocationPolicyResolver;
    @Mock
    private TontineAllocationPolicy allocationPolicy;
    @Mock
    private DailyTontineReportReconciler dailyTontineReportReconciler;

    private TontineService service;

    @BeforeEach
    void setUp() {
        service = new TontineService(
                tontineMemberRepository,
                tontineSessionRepository,
                tontineCollectionRepository,
                clientService,
                userService,
                parameterService,
                eventPublisher);
        service.setAllocationPolicyResolver(allocationPolicyResolver);
        service.setDailyTontineReportReconciler(dailyTontineReportReconciler);
    }

    @Test
    void getActiveSession_createsCurrentYearSessionWithTontineCalendarWhenMissing() {
        int currentYear = LocalDate.now().getYear();
        when(tontineSessionRepository.findByYear(currentYear)).thenReturn(Optional.empty());
        when(tontineSessionRepository.save(any(TontineSession.class))).thenAnswer(invocation -> {
            TontineSession session = invocation.getArgument(0);
            session.setId(10L);
            return session;
        });

        TontineSession result = service.getActiveSession();

        assertEquals(10L, result.getId());
        assertEquals(currentYear, result.getYear());
        assertEquals(LocalDate.of(currentYear, 2, 1), result.getStartDate());
        assertEquals(LocalDate.of(currentYear, 11, 30), result.getEndDate());
        assertEquals(TontineSessionStatus.ACTIVE, result.getStatus());
        verify(tontineSessionRepository).save(any(TontineSession.class));
    }

    @Test
    void closeCurrentSession_marksInProgressMembersPendingAndPreservesExistingPendingMembers() {
        int currentYear = LocalDate.now().getYear();
        TontineSession session = session(10L, currentYear, TontineSessionStatus.ACTIVE);
        TontineMember inProgress = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        TontineMember alreadyPending = member(TontineMemberDeliveryStatus.PENDING);
        when(tontineSessionRepository.findByYear(currentYear)).thenReturn(Optional.of(session));
        when(tontineMemberRepository.findByTontineSessionIdAndState(
                10L, State.ENABLED, PageRequest.of(0, 100)))
                .thenReturn(new PageImpl<>(List.of(inProgress, alreadyPending)));

        TontineSession result = service.closeCurrentSession();

        assertEquals(TontineSessionStatus.CLOSED, result.getStatus());
        assertEquals(TontineMemberDeliveryStatus.PENDING, inProgress.getDeliveryStatus());
        assertEquals(TontineMemberDeliveryStatus.PENDING, alreadyPending.getDeliveryStatus());
        verify(tontineSessionRepository).save(session);
        verify(tontineMemberRepository).saveAll(List.of(inProgress, alreadyPending));
    }

    @Test
    void closeCurrentSession_doesNothingWhenSessionIsAlreadyClosed() {
        int currentYear = LocalDate.now().getYear();
        TontineSession session = session(10L, currentYear, TontineSessionStatus.CLOSED);
        when(tontineSessionRepository.findByYear(currentYear)).thenReturn(Optional.of(session));

        TontineSession result = service.closeCurrentSession();

        assertEquals(TontineSessionStatus.CLOSED, result.getStatus());
        verify(tontineSessionRepository, never()).save(session);
        verify(tontineMemberRepository, never()).findByTontineSessionIdAndState(
                10L, State.ENABLED, PageRequest.of(0, 100));
    }

    @Test
    void reopenCurrentSessionForE2e_reactivatesClosedSession() {
        int currentYear = LocalDate.now().getYear();
        TontineSession session = session(10L, currentYear, TontineSessionStatus.CLOSED);
        when(tontineSessionRepository.findByYear(currentYear)).thenReturn(Optional.of(session));
        when(tontineSessionRepository.save(session)).thenReturn(session);

        TontineSession result = service.reopenCurrentSessionForE2e();

        assertEquals(TontineSessionStatus.ACTIVE, result.getStatus());
        verify(tontineSessionRepository).save(session);
    }

    @Test
    void recordCollection_usesClientTontineCollectorNotOperatorUsername() {
        int year = LocalDate.now().getYear();
        TontineSession activeSession = session(10L, year, TontineSessionStatus.ACTIVE);
        activeSession.setStartDate(LocalDate.of(year, 2, 1));
        activeSession.setEndDate(LocalDate.of(year, 11, 30));
        Client client = new Client();
        client.setTontineCollector("COM015");
        client.setFirstname("Client");
        client.setLastname("A1");
        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(50L);
        member.setClient(client);
        member.setTontineSession(activeSession);
        member.setAmount(1000.0);

        when(tontineSessionRepository.findByYear(year)).thenReturn(Optional.of(activeSession));
        when(tontineMemberRepository.findById(50L)).thenReturn(Optional.of(member));
        when(allocationPolicyResolver.resolve()).thenReturn(allocationPolicy);
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(
                50L, State.ENABLED)).thenReturn(List.of());
        when(tontineCollectionRepository.save(any(TontineCollection.class))).thenAnswer(inv -> {
            TontineCollection c = inv.getArgument(0);
            c.setId(99L);
            c.setCreatedDate(LocalDateTime.now());
            return c;
        });

        TontineCollectionDto dto = new TontineCollectionDto();
        dto.setMemberId(50L);
        dto.setAmount(2500.0);

        service.recordCollection(dto);

        ArgumentCaptor<TontineCollection> saved = ArgumentCaptor.forClass(TontineCollection.class);
        verify(tontineCollectionRepository).save(saved.capture());
        assertEquals("COM015", saved.getValue().getCommercialUsername());

        ArgumentCaptor<TontineCollectionEvent> eventCaptor = ArgumentCaptor.forClass(TontineCollectionEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals("COM015", eventCaptor.getValue().getCollector());
    }

    @Test
    void cancelCollection_afterReassignment_impactsOriginalCommercialNotNewCollector() {
        LocalDate collectionDay = LocalDate.of(2026, 8, 1);
        Client client = new Client();
        client.setTontineCollector("COM_B");
        client.setFirstname("Client");
        client.setLastname("A1");
        TontineSession sessionEntity = session(10L, 2026, TontineSessionStatus.ACTIVE);
        TontineMember memberEntity = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        memberEntity.setId(50L);
        memberEntity.setClient(client);
        memberEntity.setTontineSession(sessionEntity);

        TontineCollection collection = new TontineCollection();
        collection.setId(77L);
        collection.setAmount(3000.0);
        collection.setCommercialUsername("COM_A");
        collection.setCollectionDate(collectionDay.atStartOfDay());
        collection.setCreatedDate(collectionDay.atTime(10, 0));
        collection.setReference("COL-A1");
        collection.setTontineMember(memberEntity);
        collection.setState(State.ENABLED);

        when(tontineCollectionRepository.findById(77L)).thenReturn(Optional.of(collection));
        when(allocationPolicyResolver.resolve()).thenReturn(allocationPolicy);
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(
                50L, State.ENABLED)).thenReturn(List.of());
        when(tontineCollectionRepository.save(any(TontineCollection.class))).thenAnswer(inv -> inv.getArgument(0));

        service.cancelCollection(77L);

        verify(dailyTontineReportReconciler).reconcile(eq("COM_A"), eq(collectionDay));
        verify(dailyTontineReportReconciler, never()).reconcile(eq("COM_B"), any());

        ArgumentCaptor<TontineCollectionCancelledEvent> eventCaptor =
                ArgumentCaptor.forClass(TontineCollectionCancelledEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals("COM_A", eventCaptor.getValue().getCollector());
    }

    private TontineSession session(Long id, int year, TontineSessionStatus status) {
        TontineSession session = new TontineSession();
        session.setId(id);
        session.setYear(year);
        session.setStatus(status);
        return session;
    }

    private TontineMember member(TontineMemberDeliveryStatus deliveryStatus) {
        TontineMember member = new TontineMember();
        member.setDeliveryStatus(deliveryStatus);
        return member;
    }
}
