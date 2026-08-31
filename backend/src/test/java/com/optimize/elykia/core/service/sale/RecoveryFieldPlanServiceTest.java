package com.optimize.elykia.core.service.sale;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.sale.FieldDayPlanRequestDto;
import com.optimize.elykia.core.dto.sale.RmClientContactUpdateDto;
import com.optimize.elykia.core.entity.sale.RecoveryFieldDayPlan;
import com.optimize.elykia.core.enumaration.FieldDayPlanStatus;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.RecoveryFieldDayPlanRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.CreditLateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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
                new ObjectMapper());
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
    void createOrReplacePlan_rejectsMoreThanThreeDistinctCommercials() {
        // Given
        FieldDayPlanRequestDto request = planRequest(LocalDate.now(), List.of("c1", "c2", "c3", "c4"), List.of());

        // When
        ApplicationException exception = assertThrows(ApplicationException.class,
                () -> service.createOrReplacePlan(request, "manager.a"));

        // Then
        assertTrue(exception.getMessage().contains("Maximum 3 commerciaux"));
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
