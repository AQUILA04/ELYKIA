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
import com.optimize.elykia.core.dto.CreateTontineSessionDto;
import com.optimize.elykia.core.enumaration.TontineSessionKind;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import org.springframework.security.access.AccessDeniedException;
import com.optimize.elykia.core.event.TontineCollectionCancelledEvent;
import com.optimize.elykia.core.event.TontineCollectionEvent;
import com.optimize.elykia.core.event.TontineMemberEnrolledEvent;
import com.optimize.elykia.core.enumaration.TontineMemberRegistrationSource;
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

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.dto.BulkAssignCollectorsDto;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.elykia.core.dto.BulkTontineAssignCollectorDto;
import com.optimize.elykia.core.dto.TontineMemberAmountHistoryArchiveDto;
import com.optimize.elykia.core.dto.TontineMemberDto;
import com.optimize.elykia.core.dto.TontineMemberRespDto;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistoryArchive;
import com.optimize.elykia.core.enumaration.TontineMemberUpdateScope;
import com.optimize.elykia.core.repository.TontineMemberAmountHistoryArchiveRepository;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
    @Mock
    private TontineMemberAmountHistoryArchiveRepository tontineMemberAmountHistoryArchiveRepository;

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
        service.setTontineMemberAmountHistoryArchiveRepository(tontineMemberAmountHistoryArchiveRepository);
    }

    @Test
    void getActiveSession_createsCurrentYearSessionWithTontineCalendarWhenMissing() {
        int currentYear = LocalDate.now().getYear();
        when(tontineSessionRepository.findByYearAndKind(currentYear, TontineSessionKind.ANNUAL))
                .thenReturn(Optional.empty());
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
        assertEquals("Session annuelle " + currentYear, result.getName());
        assertEquals("ANNUELLE-" + currentYear, result.getCode());
        assertEquals(TontineSessionKind.ANNUAL, result.getKind());
        verify(tontineSessionRepository).save(any(TontineSession.class));
    }

    @Test
    void ensureAnnualSession_doesNotRecreateWhenPresent() {
        int year = LocalDate.now().getYear();
        TontineSession existing = session(7L, year, TontineSessionStatus.ACTIVE);
        existing.setKind(TontineSessionKind.ANNUAL);
        when(tontineSessionRepository.findByYearAndKind(year, TontineSessionKind.ANNUAL))
                .thenReturn(Optional.of(existing));

        TontineSession result = service.ensureAnnualSession(year);

        assertEquals(7L, result.getId());
        verify(tontineSessionRepository, never()).save(any());
    }

    @Test
    void createExtraSession_rejectsCommercial() {
        User commercial = mock(User.class);
        when(commercial.is(any())).thenReturn(false);
        when(userService.getCurrentUser()).thenReturn(commercial);
        CreateTontineSessionDto dto = new CreateTontineSessionDto();
        dto.setName("Pâques");
        dto.setStartDate(LocalDate.of(2026, 4, 1));
        dto.setEndDate(LocalDate.of(2026, 4, 20));

        assertThrows(AccessDeniedException.class, () -> service.createExtraSession(dto));
        verify(tontineSessionRepository, never()).save(any());
    }

    @Test
    void createExtraSession_rejectsEndNotAfterStart() {
        User admin = mock(User.class);
        when(admin.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(admin.is(UserProfilConstant.ADMIN)).thenReturn(true);
        when(userService.getCurrentUser()).thenReturn(admin);
        CreateTontineSessionDto dto = new CreateTontineSessionDto();
        dto.setName("Pâques");
        dto.setStartDate(LocalDate.of(2026, 4, 20));
        dto.setEndDate(LocalDate.of(2026, 4, 1));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> service.createExtraSession(dto));
        assertTrue(ex.getMessage().contains("postérieure"));
    }

    @Test
    void closeCurrentSession_marksInProgressMembersPendingAndPreservesExistingPendingMembers() {
        int currentYear = LocalDate.now().getYear();
        TontineSession session = session(10L, currentYear, TontineSessionStatus.ACTIVE);
        TontineMember inProgress = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        TontineMember alreadyPending = member(TontineMemberDeliveryStatus.PENDING);
        when(tontineSessionRepository.findByYearAndKind(currentYear, TontineSessionKind.ANNUAL)).thenReturn(Optional.of(session));
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
        when(tontineSessionRepository.findByYearAndKind(currentYear, TontineSessionKind.ANNUAL)).thenReturn(Optional.of(session));

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
        when(tontineSessionRepository.findByYearAndKind(currentYear, TontineSessionKind.ANNUAL)).thenReturn(Optional.of(session));
        when(tontineSessionRepository.save(session)).thenReturn(session);

        TontineSession result = service.reopenCurrentSessionForE2e();

        assertEquals(TontineSessionStatus.ACTIVE, result.getStatus());
        verify(tontineSessionRepository).save(session);
    }

    @Test
    void recordCollection_usesClientTontineCollectorNotOperatorUsername() {
        int year = LocalDate.now().getYear();
        TontineSession activeSession = session(10L, year, TontineSessionStatus.ACTIVE);
        activeSession.setStartDate(LocalDate.of(year, 1, 1));
        activeSession.setEndDate(LocalDate.of(year, 12, 31));
        Client client = new Client();
        client.setTontineCollector("COM015");
        client.setFirstname("Client");
        client.setLastname("A1");
        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(50L);
        member.setClient(client);
        member.setTontineSession(activeSession);
        member.setAmount(1000.0);

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
    void recordCollection_promoterCannotCollectForOtherTontineCollector() {
        int year = LocalDate.now().getYear();
        TontineSession activeSession = session(10L, year, TontineSessionStatus.ACTIVE);
        Client client = new Client();
        client.setTontineCollector("COM003");
        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(50L);
        member.setClient(client);
        member.setTontineSession(activeSession);

        User promoter = promoterOnly("COM015");
        when(tontineMemberRepository.findById(50L)).thenReturn(Optional.of(member));
        when(userService.getCurrentUser()).thenReturn(promoter);

        TontineCollectionDto dto = new TontineCollectionDto();
        dto.setMemberId(50L);
        dto.setAmount(500.0);

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> service.recordCollection(dto));
        assertTrue(ex.getMessage().contains("commercial tontine"));
        verify(tontineCollectionRepository, never()).save(any());
    }

    @Test
    void recordCollection_promoterOwnsTontineCollector_succeeds() {
        int year = LocalDate.now().getYear();
        TontineSession activeSession = session(10L, year, TontineSessionStatus.ACTIVE);
        activeSession.setStartDate(LocalDate.of(year, 1, 1));
        activeSession.setEndDate(LocalDate.of(year, 12, 31));
        Client client = new Client();
        client.setTontineCollector("COM015");
        client.setFirstname("Client");
        client.setLastname("A1");
        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(50L);
        member.setClient(client);
        member.setTontineSession(activeSession);
        member.setAmount(1000.0);

        User promoter = promoterOnly("COM015");
        when(tontineMemberRepository.findById(50L)).thenReturn(Optional.of(member));
        when(userService.getCurrentUser()).thenReturn(promoter);
        when(allocationPolicyResolver.resolve()).thenReturn(allocationPolicy);
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(
                50L, State.ENABLED)).thenReturn(List.of());
        when(tontineCollectionRepository.save(any(TontineCollection.class))).thenAnswer(inv -> {
            TontineCollection c = inv.getArgument(0);
            c.setId(100L);
            c.setCreatedDate(LocalDateTime.now());
            return c;
        });

        TontineCollectionDto dto = new TontineCollectionDto();
        dto.setMemberId(50L);
        dto.setAmount(500.0);

        service.recordCollection(dto);
        verify(tontineCollectionRepository).save(any(TontineCollection.class));
    }

    @Test
    void recordCollection_staffCanCollectForAnyTontineCollector() {
        int year = LocalDate.now().getYear();
        TontineSession activeSession = session(10L, year, TontineSessionStatus.ACTIVE);
        activeSession.setStartDate(LocalDate.of(year, 1, 1));
        activeSession.setEndDate(LocalDate.of(year, 12, 31));
        Client client = new Client();
        client.setTontineCollector("COM003");
        client.setFirstname("Client");
        client.setLastname("A1");
        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(50L);
        member.setClient(client);
        member.setTontineSession(activeSession);
        member.setAmount(1000.0);

        User staff = staffUser("SEC001");
        when(tontineMemberRepository.findById(50L)).thenReturn(Optional.of(member));
        when(userService.getCurrentUser()).thenReturn(staff);
        when(allocationPolicyResolver.resolve()).thenReturn(allocationPolicy);
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(
                50L, State.ENABLED)).thenReturn(List.of());
        when(tontineCollectionRepository.save(any(TontineCollection.class))).thenAnswer(inv -> {
            TontineCollection c = inv.getArgument(0);
            c.setId(101L);
            c.setCreatedDate(LocalDateTime.now());
            return c;
        });

        TontineCollectionDto dto = new TontineCollectionDto();
        dto.setMemberId(50L);
        dto.setAmount(500.0);

        service.recordCollection(dto);
        ArgumentCaptor<TontineCollection> saved = ArgumentCaptor.forClass(TontineCollection.class);
        verify(tontineCollectionRepository).save(saved.capture());
        assertEquals("COM003", saved.getValue().getCommercialUsername());
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

    @Test
    void bulkAssignCollector_updatesCollectorForMembersClients() {
        Client client1 = new Client();
        client1.setId(101L);
        TontineMember member1 = new TontineMember();
        member1.setId(1L);
        member1.setClient(client1);

        Client client2 = new Client();
        client2.setId(102L);
        TontineMember member2 = new TontineMember();
        member2.setId(2L);
        member2.setClient(client2);

        when(tontineMemberRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(member1, member2));

        User currentUser = org.mockito.Mockito.mock(User.class);
        when(currentUser.getUsername()).thenReturn("admin.user");
        when(userService.getCurrentUser()).thenReturn(currentUser);

        BulkTontineAssignCollectorDto dto = new BulkTontineAssignCollectorDto();
        dto.setMemberIds(List.of(1L, 2L));
        dto.setTontineCollector("new.collector");

        service.bulkAssignCollector(dto);

        ArgumentCaptor<BulkAssignCollectorsDto> captor = ArgumentCaptor.forClass(BulkAssignCollectorsDto.class);
        verify(clientService).bulkAssignCollectors(captor.capture(), eq("admin.user"));

        BulkAssignCollectorsDto capturedDto = captor.getValue();
        assertEquals(List.of(101L, 102L), capturedDto.getClientIds());
        assertEquals("new.collector", capturedDto.getTontineCollector());
    }

    @Test
    void bulkAssignCollector_throwsWhenMemberIdsEmpty() {
        BulkTontineAssignCollectorDto dto = new BulkTontineAssignCollectorDto();
        dto.setMemberIds(List.of());
        dto.setTontineCollector("collector.a");

        assertThrows(CustomValidationException.class, () -> service.bulkAssignCollector(dto));
    }

    @Test
    void bulkAssignCollector_throwsWhenCollectorBlank() {
        BulkTontineAssignCollectorDto dto = new BulkTontineAssignCollectorDto();
        dto.setMemberIds(List.of(1L));
        dto.setTontineCollector("   ");

        assertThrows(CustomValidationException.class, () -> service.bulkAssignCollector(dto));
    }

    @Test
    void updateMember_withGlobalScope_andUseRegistrationDateTrue_usesMemberRegistrationDate() {
        int year = LocalDate.now().getYear();
        LocalDate sessionStart = LocalDate.of(year, 2, 1);
        LocalDate registrationDate = LocalDate.of(year, 5, 10);

        TontineSession session = session(10L, year, TontineSessionStatus.ACTIVE);
        session.setStartDate(sessionStart);

        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(100L);
        member.setAmount(1000.0);
        member.setTontineSession(session);
        member.setRegistrationDate(registrationDate.atTime(10, 0));

        TontineMemberAmountHistory initialHistory = new TontineMemberAmountHistory();
        initialHistory.setStartDate(sessionStart);
        initialHistory.setAmount(1000.0);
        initialHistory.setTontineMember(member);
        initialHistory.setNotes("Riz 25kg");
        member.getAmountHistory().add(initialHistory);

        when(tontineMemberRepository.findById(100L)).thenReturn(Optional.of(member));
        when(parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE")).thenReturn(true);
        when(allocationPolicyResolver.resolve()).thenReturn(allocationPolicy);
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(100L, State.ENABLED))
                .thenReturn(List.of());
        when(tontineMemberRepository.sumSocietyShareByTontineSessionId(10L, State.ENABLED)).thenReturn(0.0);
        when(tontineMemberRepository.saveAndFlush(any(TontineMember.class))).thenAnswer(inv -> inv.getArgument(0));

        TontineMemberDto dto = new TontineMemberDto();
        dto.setAmount(2000.0);
        dto.setUpdateScope(TontineMemberUpdateScope.GLOBAL);
        dto.setNotes("Huile 5l");

        service.updateMember(100L, dto);

        assertEquals(1, member.getAmountHistory().size());
        TontineMemberAmountHistory newHistory = member.getAmountHistory().get(0);
        assertEquals(registrationDate, newHistory.getStartDate());
        assertEquals(2000.0, newHistory.getAmount());
        assertEquals("Huile 5l", newHistory.getNotes());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TontineMemberAmountHistoryArchive>> archiveCaptor = ArgumentCaptor.forClass(List.class);
        verify(tontineMemberAmountHistoryArchiveRepository).saveAll(archiveCaptor.capture());
        assertEquals(1, archiveCaptor.getValue().size());
        TontineMemberAmountHistoryArchive arch = archiveCaptor.getValue().get(0);
        assertEquals(1000.0, arch.getAmount());
        assertEquals(sessionStart, arch.getStartDate());
        assertEquals(2000.0, arch.getNewAmount());
        assertEquals("Riz 25kg", arch.getNotes());
        assertNotNull(arch.getBatchId());
    }

    @Test
    void updateMember_withAmountChangeAndNotes_storesNotesOnMemberAndNewPeriodOnly() {
        LocalDate previousStart = LocalDate.now().withDayOfMonth(1).minusMonths(1);
        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(100L);
        member.setAmount(100.0);
        member.setNotes("Sucrerie");

        TontineMemberAmountHistory previous = new TontineMemberAmountHistory();
        previous.setStartDate(previousStart);
        previous.setAmount(100.0);
        previous.setTontineMember(member);
        previous.setNotes("Sucrerie");
        member.getAmountHistory().add(previous);

        when(tontineMemberRepository.findById(100L)).thenReturn(Optional.of(member));
        when(tontineMemberRepository.saveAndFlush(any(TontineMember.class))).thenAnswer(inv -> inv.getArgument(0));

        TontineMemberDto dto = new TontineMemberDto();
        dto.setAmount(200.0);
        dto.setUpdateScope(TontineMemberUpdateScope.CURRENT_AND_FUTURE);
        dto.setNotes("  Riz 50kg huile 5l  ");

        service.updateMember(100L, dto);

        assertEquals("Riz 50kg huile 5l", member.getNotes());
        assertEquals(2, member.getAmountHistory().size());
        assertEquals("Sucrerie", previous.getNotes());
        TontineMemberAmountHistory current = member.getAmountHistory().get(1);
        assertEquals(200.0, current.getAmount());
        assertEquals(LocalDate.now().withDayOfMonth(1), current.getStartDate());
        assertEquals("Riz 50kg huile 5l", current.getNotes());
    }

    @Test
    void updateMember_withBlankNotes_keepsExistingMemberNotes() {
        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(100L);
        member.setAmount(100.0);
        member.setNotes("Sucrerie");

        when(tontineMemberRepository.findById(100L)).thenReturn(Optional.of(member));
        when(tontineMemberRepository.saveAndFlush(any(TontineMember.class))).thenAnswer(inv -> inv.getArgument(0));

        TontineMemberDto dto = new TontineMemberDto();
        dto.setAmount(100.0);
        dto.setNotes("   ");

        service.updateMember(100L, dto);

        assertEquals("Sucrerie", member.getNotes());
    }

    @Test
    void updateMember_withGlobalScope_andUseRegistrationDateFalse_usesSessionStartDate() {
        int year = LocalDate.now().getYear();
        LocalDate sessionStart = LocalDate.of(year, 2, 1);
        LocalDate registrationDate = LocalDate.of(year, 5, 10);

        TontineSession session = session(10L, year, TontineSessionStatus.ACTIVE);
        session.setStartDate(sessionStart);

        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(100L);
        member.setAmount(1000.0);
        member.setTontineSession(session);
        member.setRegistrationDate(registrationDate.atTime(10, 0));

        TontineMemberAmountHistory initialHistory = new TontineMemberAmountHistory();
        initialHistory.setStartDate(sessionStart);
        initialHistory.setAmount(1000.0);
        initialHistory.setTontineMember(member);
        member.getAmountHistory().add(initialHistory);

        when(tontineMemberRepository.findById(100L)).thenReturn(Optional.of(member));
        when(parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE")).thenReturn(false);
        when(allocationPolicyResolver.resolve()).thenReturn(allocationPolicy);
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(100L, State.ENABLED))
                .thenReturn(List.of());
        when(tontineMemberRepository.sumSocietyShareByTontineSessionId(10L, State.ENABLED)).thenReturn(0.0);
        when(tontineMemberRepository.saveAndFlush(any(TontineMember.class))).thenAnswer(inv -> inv.getArgument(0));

        TontineMemberDto dto = new TontineMemberDto();
        dto.setAmount(2000.0);
        dto.setUpdateScope(TontineMemberUpdateScope.GLOBAL);

        service.updateMember(100L, dto);

        assertEquals(1, member.getAmountHistory().size());
        TontineMemberAmountHistory newHistory = member.getAmountHistory().get(0);
        assertEquals(sessionStart, newHistory.getStartDate());
        assertEquals(2000.0, newHistory.getAmount());
    }

    @Test
    void createMember_withUseRegistrationDateTrue_usesMemberRegistrationDate() {
        int year = LocalDate.now().getYear();
        LocalDate sessionStart = LocalDate.of(year, 2, 1);

        TontineSession session = session(10L, year, TontineSessionStatus.ACTIVE);
        session.setStartDate(sessionStart);

        Client client = new Client();
        client.setId(55L);
        client.setFirstname("Jean");
        client.setLastname("Dupont");
        client.setCollector("COM001");
        client.setTontineCollector("COM001");

        when(clientService.getById(55L)).thenReturn(client);
        when(tontineSessionRepository.findByYearAndKind(year, TontineSessionKind.ANNUAL)).thenReturn(Optional.of(session));
        when(tontineMemberRepository.findByTontineSession_IdAndClient_IdAndState(session.getId(), 55L, State.ENABLED)).thenReturn(Optional.empty());
        when(parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE")).thenReturn(true);
        when(tontineMemberRepository.save(any(TontineMember.class))).thenAnswer(inv -> inv.getArgument(0));

        TontineMemberDto dto = new TontineMemberDto();
        dto.setClientId(55L);
        dto.setAmount(1500.0);
        dto.setNotes(" Riz 25kg ");

        TontineMemberRespDto resp = service.registerMember(dto);

        ArgumentCaptor<TontineMember> captor = ArgumentCaptor.forClass(TontineMember.class);
        verify(tontineMemberRepository).save(captor.capture());
        TontineMember created = captor.getValue();

        assertEquals(1, created.getAmountHistory().size());
        TontineMemberAmountHistory history = created.getAmountHistory().get(0);
        assertEquals(LocalDate.now(), history.getStartDate());
        assertEquals(1500.0, history.getAmount());
        assertEquals("Riz 25kg", created.getNotes());
        assertEquals("Riz 25kg", history.getNotes());
        assertEquals(com.optimize.elykia.core.enumaration.TontineMemberRegistrationSource.STAFF,
                created.getRegistrationSource());
    }

    @Test
    void registerMember_withCustomerSpaceSource_setsRegistrationSource() {
        int year = LocalDate.now().getYear();
        TontineSession session = session(1L, year, TontineSessionStatus.ACTIVE);
        session.setStartDate(LocalDate.of(year, 2, 1));

        Client client = new Client();
        client.setId(55L);
        client.setFirstname("Afi");
        client.setLastname("Koffi");
        client.setCollector("COM001");
        client.setTontineCollector("COM001");

        when(clientService.getById(55L)).thenReturn(client);
        when(tontineSessionRepository.findByYearAndKind(year, TontineSessionKind.ANNUAL)).thenReturn(Optional.of(session));
        when(tontineMemberRepository.findByTontineSession_IdAndClient_IdAndState(session.getId(), 55L, State.ENABLED)).thenReturn(Optional.empty());
        when(parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE")).thenReturn(true);
        when(tontineMemberRepository.save(any(TontineMember.class))).thenAnswer(inv -> inv.getArgument(0));

        TontineMemberDto dto = new TontineMemberDto();
        dto.setClientId(55L);
        dto.setAmount(100.0);
        dto.setFrequency(com.optimize.elykia.core.enumaration.TontineMemberFrequency.DAILY);

        TontineMemberRespDto resp = service.registerMember(
                dto, com.optimize.elykia.core.enumaration.TontineMemberRegistrationSource.CUSTOMER_SPACE);

        ArgumentCaptor<TontineMember> captor = ArgumentCaptor.forClass(TontineMember.class);
        verify(tontineMemberRepository).save(captor.capture());
        assertEquals(com.optimize.elykia.core.enumaration.TontineMemberRegistrationSource.CUSTOMER_SPACE,
                captor.getValue().getRegistrationSource());
        assertEquals(Boolean.TRUE, resp.selfRegistered());
        assertEquals(com.optimize.elykia.core.enumaration.TontineMemberRegistrationSource.CUSTOMER_SPACE,
                resp.registrationSource());
    }

    @Test
    void registerMember_fromCustomerSpace_attributesEnrollmentToTontineCollectorNotClientAccount() {
        Client client = enrollableClient("COM001", "TCOM07");

        service.registerMember(enrollmentDto(), TontineMemberRegistrationSource.CUSTOMER_SPACE);

        ArgumentCaptor<TontineMemberEnrolledEvent> eventCaptor =
                ArgumentCaptor.forClass(TontineMemberEnrolledEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals("TCOM07", eventCaptor.getValue().getCollector());
        assertEquals(client.getFullName(), eventCaptor.getValue().getClientName());
    }

    @Test
    void registerMember_byStaff_attributesEnrollmentToTontineCollectorNotOperator() {
        enrollableClient("COM001", "TCOM07", "SECRETAIRE01");

        service.registerMember(enrollmentDto(), TontineMemberRegistrationSource.STAFF);

        ArgumentCaptor<TontineMemberEnrolledEvent> eventCaptor =
                ArgumentCaptor.forClass(TontineMemberEnrolledEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals("TCOM07", eventCaptor.getValue().getCollector());
    }

    @Test
    void registerMember_withoutTontineCollector_isRejectedBeforeAnyWrite() {
        Client client = new Client();
        client.setId(55L);
        client.setCollector("COM001");
        when(clientService.getById(55L)).thenReturn(client);

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> service.registerMember(enrollmentDto(), TontineMemberRegistrationSource.CUSTOMER_SPACE));

        assertEquals("Le client n'a pas de commercial tontine associé : impossible d'enregistrer l'adhésion.",
                ex.getMessage());
        verify(tontineMemberRepository, never()).save(any(TontineMember.class));
        verify(eventPublisher, never()).publishEvent(any(TontineMemberEnrolledEvent.class));
    }

    private Client enrollableClient(String collector, String tontineCollector) {
        return enrollableClient(collector, tontineCollector, "93047800");
    }

    private Client enrollableClient(String collector, String tontineCollector, String operatorUsername) {
        int year = LocalDate.now().getYear();
        TontineSession session = session(1L, year, TontineSessionStatus.ACTIVE);
        session.setStartDate(LocalDate.of(year, 2, 1));

        Client client = new Client();
        client.setId(55L);
        client.setFirstname("Afi");
        client.setLastname("Koffi");
        client.setCollector(collector);
        client.setTontineCollector(tontineCollector);

        when(clientService.getById(55L)).thenReturn(client);
        when(tontineSessionRepository.findByYearAndKind(year, TontineSessionKind.ANNUAL)).thenReturn(Optional.of(session));
        when(tontineMemberRepository.findByTontineSession_IdAndClient_IdAndState(session.getId(), 55L, State.ENABLED)).thenReturn(Optional.empty());
        when(parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE")).thenReturn(true);
        when(tontineMemberRepository.save(any(TontineMember.class))).thenAnswer(inv -> {
            TontineMember saved = inv.getArgument(0);
            saved.setCreatedBy(operatorUsername);
            return saved;
        });
        return client;
    }

    private TontineMemberDto enrollmentDto() {
        TontineMemberDto dto = new TontineMemberDto();
        dto.setClientId(55L);
        dto.setAmount(100.0);
        dto.setFrequency(com.optimize.elykia.core.enumaration.TontineMemberFrequency.DAILY);
        return dto;
    }

    @Test
    void getMembers_passesRegistrationSourceFilterToRepository() {
        int year = LocalDate.now().getYear();
        User user = mock(User.class);
        when(user.is(any())).thenReturn(false);
        when(tontineMemberRepository.findMembersDto(
                eq(year), eq(null), eq(null), eq(null),
                eq(com.optimize.elykia.core.enumaration.TontineMemberRegistrationSource.CUSTOMER_SPACE),
                eq(null),
                any()))
                .thenReturn(new PageImpl<>(List.of()));

        service.getMembers(user, null, null, null, null, "CUSTOMER_SPACE", PageRequest.of(0, 20));

        verify(tontineMemberRepository).findMembersDto(
                eq(year), eq(null), eq(null), eq(null),
                eq(com.optimize.elykia.core.enumaration.TontineMemberRegistrationSource.CUSTOMER_SPACE),
                eq(null),
                any());
    }

    @Test
    void getMemberAmountHistoryArchives_returnsMappedList() {
        TontineMember member = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setId(100L);
        when(tontineMemberRepository.findById(100L)).thenReturn(Optional.of(member));

        TontineMemberAmountHistoryArchive arch = new TontineMemberAmountHistoryArchive();
        arch.setId(1L);
        arch.setTontineMember(member);
        arch.setAmount(1000.0);
        arch.setStartDate(LocalDate.of(2026, 2, 1));
        arch.setBatchId("BATCH-123");
        arch.setArchivedBy("admin");
        arch.setArchivedAt(LocalDateTime.now());
        arch.setNewAmount(2500.0);
        arch.setNotes("Huile 5l");

        when(tontineMemberAmountHistoryArchiveRepository
                .findByTontineMember_IdOrderByArchivedAtDescStartDateAsc(100L))
                .thenReturn(List.of(arch));

        List<TontineMemberAmountHistoryArchiveDto> result = service.getMemberAmountHistoryArchives(100L);

        assertEquals(1, result.size());
        assertEquals("BATCH-123", result.get(0).batchId());
        assertEquals(1000.0, result.get(0).amount());
        assertEquals(2500.0, result.get(0).newAmount());
        assertEquals("Huile 5l", result.get(0).notes());
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

    private static User promoterOnly(String username) {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn(username);
        when(user.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        return user;
    }

    private static User staffUser(String username) {
        User user = mock(User.class);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(false);
        return user;
    }
}
