package com.optimize.elykia.core.service.sale;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.sale.FieldDayPlanRequestDto;
import com.optimize.elykia.core.dto.sale.RmClientContactUpdateDto;
import com.optimize.elykia.core.dto.sale.RmPackTontineMonthDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.entity.sale.RecoveryFieldDayPlan;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.enumaration.FieldDayPlanStatus;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy.EcartDecisionView;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.RecoveryFieldDayPlanRepository;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberAmountHistoryRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.tontine.allocation.TontineAmountHistoryHelper;
import com.optimize.elykia.core.service.CreditLateService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecoveryFieldPlanServiceTest {

    @Mock
    private RecoveryFieldDayPlanRepository planRepository;
    @Mock
    private CreditLateService creditLateService;
    @Mock
    private CreditRepository creditRepository;
    @Mock
    private CreditFieldControlRepository creditFieldControlRepository;
    @Mock
    private TontineMemberRepository tontineMemberRepository;
    @Mock
    private TontineCollectionRepository tontineCollectionRepository;
    @Mock
    private TontineMemberFieldControlRepository tontineMemberFieldControlRepository;
    @Mock
    private ClientService clientService;
    @Mock
    private CarnetEcartRecontrolPolicy recontrolPolicy;
    @Mock
    private ParameterService parameterService;
    @Mock
    private TontineMemberAmountHistoryRepository amountHistoryRepository;
    @Mock
    private Client client;

    private RecoveryFieldPlanService service;

    @BeforeEach
    void setUp() {
        service = new RecoveryFieldPlanService(
                planRepository,
                creditLateService,
                creditRepository,
                creditFieldControlRepository,
                tontineMemberRepository,
                tontineCollectionRepository,
                tontineMemberFieldControlRepository,
                clientService,
                new ObjectMapper(),
                recontrolPolicy,
                parameterService,
                amountHistoryRepository,
                new TontineAmountHistoryHelper(parameterService));
    }

    @Test
    void getCollectorStats_includesCreditCollectorsWithZeroLateCount() {
        // Given
        when(creditRepository.findDistinctCollectors()).thenReturn(List.of("commercial.a"));
        when(tontineMemberRepository.findDistinctTontineCollectorsBySessionYear(
                LocalDate.now().getYear(), State.ENABLED)).thenReturn(List.of());
        when(creditLateService.getLateCredits("commercial.a", null, null)).thenReturn(List.of());
        when(creditRepository.findDistinctClientQuartersByCollector("commercial.a")).thenReturn(List.of("Nord"));
        when(tontineMemberRepository.findDistinctQuartersBySessionYearAndTontineCollector(
                LocalDate.now().getYear(), "commercial.a", State.ENABLED)).thenReturn(List.of());

        // When
        var stats = service.getCollectorStats();

        // Then
        assertEquals(1, stats.size());
        assertEquals("commercial.a", stats.get(0).getUsername());
        assertEquals(0L, stats.get(0).getLateCount());
        assertEquals(0.0, stats.get(0).getTotalAmountRemaining());
        assertEquals(List.of("Nord"), stats.get(0).getQuarters());
    }

    @Test
    void getCollectorStats_includesTontineOnlyCollectorWithoutEnabledCredits() {
        // Given
        when(creditRepository.findDistinctCollectors()).thenReturn(List.of());
        when(tontineMemberRepository.findDistinctTontineCollectorsBySessionYear(
                LocalDate.now().getYear(), State.ENABLED)).thenReturn(List.of("tontine.only"));
        when(creditLateService.getLateCredits("tontine.only", null, null)).thenReturn(List.of());
        when(creditRepository.findDistinctClientQuartersByCollector("tontine.only")).thenReturn(List.of());
        when(tontineMemberRepository.findDistinctQuartersBySessionYearAndTontineCollector(
                LocalDate.now().getYear(), "tontine.only", State.ENABLED)).thenReturn(List.of("Sud"));

        // When
        var stats = service.getCollectorStats();

        // Then
        assertEquals(1, stats.size());
        assertEquals("tontine.only", stats.get(0).getUsername());
        assertEquals(0L, stats.get(0).getLateCount());
        assertEquals(List.of("Sud"), stats.get(0).getQuarters());
        assertEquals(0L, stats.get(0).getTontineMemberCount());
    }

    @Test
    void getCollectorStats_includesInProgressTontineCollectorWithoutAnyLate() {
        // Given — absent des retards crédit et de la liste tontine « tous statuts »,
        // présent uniquement comme commercial d'une tontine en cours.
        when(creditRepository.findDistinctCollectors()).thenReturn(List.of());
        when(tontineMemberRepository.findDistinctTontineCollectorsBySessionYear(
                LocalDate.now().getYear(), State.ENABLED)).thenReturn(List.of());
        when(tontineMemberRepository.countInProgressByTontineCollector(
                LocalDate.now().getYear(), State.ENABLED, TontineMemberDeliveryStatus.SESSION_INPROGRESS))
                .thenReturn(Collections.singletonList(new Object[] { "tontine.courante", 4L }));
        when(creditLateService.getLateCredits("tontine.courante", null, null)).thenReturn(List.of());
        when(creditRepository.findDistinctClientQuartersByCollector("tontine.courante")).thenReturn(List.of());
        when(tontineMemberRepository.findDistinctQuartersBySessionYearAndTontineCollector(
                LocalDate.now().getYear(), "tontine.courante", State.ENABLED)).thenReturn(List.of("Agoè"));

        // When
        var stats = service.getCollectorStats();

        // Then
        assertEquals(1, stats.size());
        assertEquals("tontine.courante", stats.get(0).getUsername());
        assertEquals(0L, stats.get(0).getLateCount());
        assertEquals(4L, stats.get(0).getTontineMemberCount());
        assertEquals(List.of("Agoè"), stats.get(0).getQuarters());
    }

    @Test
    void getCollectorStats_usesLateQuartersWithoutPortfolioLookup() {
        // Given
        CreditLateDTO late = CreditLateDTO.builder()
                .clientQuarter("Centre")
                .totalAmountRemaining(1200.0)
                .build();
        when(creditRepository.findDistinctCollectors()).thenReturn(List.of("commercial.b"));
        when(tontineMemberRepository.findDistinctTontineCollectorsBySessionYear(
                LocalDate.now().getYear(), State.ENABLED)).thenReturn(Collections.emptyList());
        when(creditLateService.getLateCredits("commercial.b", null, null)).thenReturn(List.of(late));

        // When
        var stats = service.getCollectorStats();

        // Then
        assertEquals(1, stats.size());
        assertEquals(1L, stats.get(0).getLateCount());
        assertEquals(1200.0, stats.get(0).getTotalAmountRemaining());
        assertEquals(List.of("Centre"), stats.get(0).getQuarters());
        verify(creditRepository, never()).findDistinctClientQuartersByCollector("commercial.b");
    }

    @Test
    void createOrReplacePlan_rejectsMoreThanFiveDistinctCommercials() {
        // Given
        FieldDayPlanRequestDto request = planRequest(
                LocalDate.now(), List.of("c1", "c2", "c3", "c4", "c5", "c6"), List.of());

        // When
        ApplicationException exception = assertThrows(ApplicationException.class,
                () -> service.createOrReplacePlan(request, "manager.a"));

        // Then
        assertTrue(exception.getMessage().contains("Maximum 5 commerciaux"));
        verify(planRepository, never()).save(any());
    }

    @Test
    void createOrReplacePlan_closesActivePlanAndPersistsNormalizedReplacement() {
        // Given
        RecoveryFieldDayPlan existing = activePlan(10L, LocalDate.now(), "[\"old\"]", "[]");
        FieldDayPlanRequestDto request = planRequest(
                LocalDate.now(), List.of(" commercial.a ", "commercial.a", "commercial.b "),
                List.of(" Nord ", "Nord", "Sud"));
        when(planRepository.findByRecoveryManagerUsernameAndPlanDateAndStatus(
                "manager.a", LocalDate.now(), FieldDayPlanStatus.ACTIVE)).thenReturn(Optional.of(existing));
        when(planRepository.save(any(RecoveryFieldDayPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        var result = service.createOrReplacePlan(request, "manager.a");

        // Then
        assertEquals(FieldDayPlanStatus.CLOSED, existing.getStatus());
        assertEquals(List.of("commercial.a", "commercial.b"), result.getCommercialUsernames());
        assertEquals(List.of("Nord", "Sud"), result.getQuarters());
        ArgumentCaptor<RecoveryFieldDayPlan> savedPlans = ArgumentCaptor.forClass(RecoveryFieldDayPlan.class);
        verify(planRepository, times(2)).save(savedPlans.capture());
        verify(planRepository).flush();
        assertEquals(existing, savedPlans.getAllValues().get(0));
        RecoveryFieldDayPlan replacement = savedPlans.getAllValues().get(1);
        assertEquals(FieldDayPlanStatus.ACTIVE, replacement.getStatus());
        assertEquals("manager.a", replacement.getRecoveryManagerUsername());
    }

    @Test
    void updateClientContact_withoutActivePlanIsRejectedBeforeLoadingTheClient() {
        // Given
        when(planRepository.findByRecoveryManagerUsernameAndPlanDateAndStatus(
                "manager.a", LocalDate.now(), FieldDayPlanStatus.ACTIVE)).thenReturn(Optional.empty());
        RmClientContactUpdateDto update = new RmClientContactUpdateDto();
        update.setPhone("0123456789");

        // When
        ApplicationException exception = assertThrows(ApplicationException.class,
                () -> service.updateClientContact(7L, update, "manager.a"));

        // Then
        assertTrue(exception.getMessage().contains("Aucun plan terrain ACTIVE"));
        verify(clientService, never()).getById(7L);
    }

    @Test
    void updateClientContact_singleCoordinateIsRejectedBeforeAnyClientUpdate() {
        // Given
        RecoveryFieldDayPlan active = activePlan(11L, LocalDate.now(), "[\"commercial.a\"]", "[]");
        when(planRepository.findByRecoveryManagerUsernameAndPlanDateAndStatus(
                "manager.a", LocalDate.now(), FieldDayPlanStatus.ACTIVE)).thenReturn(Optional.of(active));
        when(clientService.getById(7L)).thenReturn(client);
        when(client.getCollector()).thenReturn("commercial.a");
        RmClientContactUpdateDto update = new RmClientContactUpdateDto();
        update.setLatitude(5.1);

        // When
        ApplicationException exception = assertThrows(ApplicationException.class,
                () -> service.updateClientContact(7L, update, "manager.a"));

        // Then
        assertTrue(exception.getMessage().contains("Latitude et longitude"));
        verify(clientService, never()).updatePhoneAndGeo(eq(7L), any(), any(), any(), any());
    }

    @Test
    void buildOfflinePack_listsInProgressCreditsWithoutReplacingLateCredits() {
        RecoveryFieldDayPlan plan = activePlan(4L, LocalDate.now(), "[\"commercial.a\"]", "[\"Nord\"]");
        when(planRepository.findByIdAndRecoveryManagerUsername(4L, "manager.a")).thenReturn(Optional.of(plan));
        CreditLateDTO late = CreditLateDTO.builder()
                .id(1L).clientId(10L).clientQuarter("Nord").collector("commercial.a").build();
        CreditLateDTO current = CreditLateDTO.builder()
                .id(2L).clientId(11L).clientQuarter("Nord").collector("commercial.a").build();
        CreditLateDTO otherQuarter = CreditLateDTO.builder()
                .id(3L).clientId(12L).clientQuarter("Sud").collector("commercial.a").build();
        when(creditLateService.getLateCredits("commercial.a", null, null)).thenReturn(List.of(late));
        when(creditLateService.getInProgressCredits("commercial.a"))
                .thenReturn(List.of(late, current, otherQuarter));
        when(creditRepository.findById(any())).thenReturn(Optional.empty());
        when(creditFieldControlRepository.findLatestByCreditIds(any())).thenReturn(List.of());
        when(recontrolPolicy.viewCredits(any())).thenReturn(Map.of());

        var pack = service.buildOfflinePack(4L, "manager.a", false);

        assertEquals(List.of(1L), pack.getLateCredits().stream().map(CreditLateDTO::getId).toList());
        assertEquals(List.of(1L, 2L), pack.getInProgressCredits().stream().map(CreditLateDTO::getId).toList());
        assertEquals(2, pack.getClients().size());
        assertEquals(28_000L, pack.getStats().getEstimatedBytes());
        assertEquals(Boolean.FALSE, pack.getTontineAutoVerifyOnFieldControl());
        verify(creditFieldControlRepository).findLatestByCreditIds(argThat(ids ->
                ids.contains(1L) && ids.contains(2L) && !ids.contains(3L)));
    }

    @Test
    void buildOfflinePack_keepsAControlFromAPreviousDay() {
        RecoveryFieldDayPlan plan = activePlan(4L, LocalDate.now(), "[\"commercial.a\"]", "[]");
        when(planRepository.findByIdAndRecoveryManagerUsername(4L, "manager.a")).thenReturn(Optional.of(plan));
        CreditLateDTO current = CreditLateDTO.builder()
                .id(2L).clientId(11L).collector("commercial.a").build();
        when(creditLateService.getLateCredits("commercial.a", null, null)).thenReturn(List.of());
        when(creditLateService.getInProgressCredits("commercial.a")).thenReturn(List.of(current));
        when(creditRepository.findById(any())).thenReturn(Optional.empty());

        Credit credit = new Credit();
        credit.setId(2L);
        LocalDateTime observedAt = LocalDateTime.now().minusDays(1).withNano(0);
        CreditFieldControl control = new CreditFieldControl();
        control.setId(90L);
        control.setCredit(credit);
        control.setReference("CFC-YESTERDAY");
        control.setNotebookTotalAmount(1000d);
        control.setSystemTotalAmountPaid(1000d);
        control.setDifferenceAmount(0d);
        control.setStatus(FieldControlStatus.CONFORME);
        control.setObservedAt(observedAt);
        control.setObservedBy("manager.a");
        when(creditFieldControlRepository.findLatestByCreditIds(any())).thenReturn(List.of(control));
        when(recontrolPolicy.viewCredits(any())).thenReturn(Map.of(90L, EcartDecisionView.none()));

        var pack = service.buildOfflinePack(4L, "manager.a", false);

        assertNotNull(pack.getCreditFieldControlsToday());
        assertEquals(1, pack.getCreditFieldControlsToday().size());
        var dto = pack.getCreditFieldControlsToday().get(0);
        assertEquals(2L, dto.getCreditId());
        assertEquals(FieldControlStatus.CONFORME, dto.getStatus());
        assertEquals(observedAt, dto.getObservedAt());
        assertEquals("manager.a", dto.getObservedBy());
    }

    @Test
    void getTontineMemberForField_appliesStakeInForceAtEndOfEachMonth() {
        TontineSession session = new TontineSession();
        session.setYear(2026);
        TontineMember member = new TontineMember();
        member.setId(5L);
        member.setAmount(1000d);
        member.setTontineSession(session);
        member.setClient(client);
        when(client.getFirstname()).thenReturn("Awa");
        when(client.getLastname()).thenReturn("Koffi");
        when(client.getTontineCollector()).thenReturn("com1");
        when(tontineMemberRepository.findById(5L)).thenReturn(Optional.of(member));
        when(tontineCollectionRepository.sumMonthlyByMemberId(5L, State.ENABLED)).thenReturn(List.of());
        when(tontineCollectionRepository.sumMonthlyByMemberIdAndCommercial(5L, State.ENABLED)).thenReturn(List.of());
        when(tontineCollectionRepository.findFirstCollectionDateByMemberAndCommercial(List.of(5L), State.ENABLED))
                .thenReturn(List.of());
        when(amountHistoryRepository.findByTontineMember_IdOrderByStartDateAsc(5L)).thenReturn(List.of(
                amountHistory(300d, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 10, 31)),
                amountHistory(1000d, LocalDate.of(2026, 11, 1), null)));

        var dto = service.getTontineMemberForField(5L);

        assertEquals(300d, dailyAmount(dto.getMonths(), 9));
        assertEquals(300d, dailyAmount(dto.getMonths(), 10));
        assertEquals(1000d, dailyAmount(dto.getMonths(), 11));
        assertEquals(300d, dailyAmount(dto.getCollectors().get(0).getMonths(), 9));
        assertEquals(1000d, dailyAmount(dto.getCollectors().get(0).getMonths(), 11));
        assertTrue(member.getAmountHistory().isEmpty());
    }

    private static double dailyAmount(List<RmPackTontineMonthDto> months, int month) {
        return months.stream()
                .filter(row -> row.getMonth() == month)
                .findFirst()
                .orElseThrow()
                .getDailyAmount();
    }

    private static TontineMemberAmountHistory amountHistory(double amount, LocalDate start, LocalDate end) {
        TontineMemberAmountHistory entry = new TontineMemberAmountHistory();
        entry.setAmount(amount);
        entry.setStartDate(start);
        entry.setEndDate(end);
        return entry;
    }

    private FieldDayPlanRequestDto planRequest(LocalDate date, List<String> commercials, List<String> quarters) {
        FieldDayPlanRequestDto request = new FieldDayPlanRequestDto();
        request.setPlanDate(date);
        request.setCommercialUsernames(commercials);
        request.setQuarters(quarters);
        return request;
    }

    private RecoveryFieldDayPlan activePlan(Long id, LocalDate date, String commercialsJson, String quartersJson) {
        RecoveryFieldDayPlan plan = new RecoveryFieldDayPlan();
        plan.setId(id);
        plan.setRecoveryManagerUsername("manager.a");
        plan.setPlanDate(date);
        plan.setStatus(FieldDayPlanStatus.ACTIVE);
        plan.setCommercialUsernamesJson(commercialsJson);
        plan.setQuartersJson(quartersJson);
        return plan;
    }
}
