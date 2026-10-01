package com.optimize.elykia.core.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.ComparisonMetricsDto;
import com.optimize.elykia.core.dto.SessionComparisonDto;
import com.optimize.elykia.core.dto.SessionStatsDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.tontine.TontineSessionService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineSessionServiceTest {

    @Mock
    private TontineSessionRepository sessionRepository;
    @Mock
    private TontineMemberRepository memberRepository;
    @Mock
    private TontineCollectionRepository collectionRepository;
    @Mock
    private UserService userService;
    @InjectMocks
    private TontineSessionService tontineSessionService;

    @Test
    void getSessionStats_calculatesCollectionAndDeliveryIndicatorsFromAggregates() {
        TontineSession session = session(12L, 2026, 25_000.0);
        when(sessionRepository.findById(12L)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(null);
        when(memberRepository.countByTontineSessionIdAndState(12L, State.ENABLED)).thenReturn(4L);
        when(memberRepository.sumTotalContributionByTontineSessionId(12L, State.ENABLED)).thenReturn(100_000.0);
        when(memberRepository.countByTontineSessionIdAndStateAndDeliveryStatus(
                12L, State.ENABLED, TontineMemberDeliveryStatus.DELIVERED)).thenReturn(2L);
        when(collectionRepository.sumDeliveryCollectionsBySession(12L, State.ENABLED)).thenReturn(10_000.0);
        when(memberRepository.findTopCommercials(12L, State.ENABLED, PageRequest.of(0, 5))).thenReturn(List.of());

        SessionStatsDto stats = tontineSessionService.getSessionStats(12L);

        assertEquals(4, stats.getTotalMembers());
        assertEquals(100_000.0, stats.getTotalCollected());
        assertEquals(25_000.0, stats.getAverageContribution());
        assertEquals(2, stats.getDeliveredCount());
        assertEquals(2, stats.getPendingCount());
        assertEquals(50.0, stats.getDeliveryRate());
        assertEquals(25_000.0, stats.getTotalRevenue());
        assertEquals(10_000.0, stats.getTotalDeliveryCollections());
        verify(memberRepository, never()).countBySessionForCommercial(any(), any(), any());
    }

    @Test
    void getSessionStats_treatsNullAggregatesAndNoMembersAsZero() {
        TontineSession session = session(13L, 2026, 0.0);
        when(sessionRepository.findById(13L)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(null);
        when(memberRepository.countByTontineSessionIdAndState(13L, State.ENABLED)).thenReturn(0L);
        when(memberRepository.sumTotalContributionByTontineSessionId(13L, State.ENABLED)).thenReturn(null);
        when(memberRepository.countByTontineSessionIdAndStateAndDeliveryStatus(
                13L, State.ENABLED, TontineMemberDeliveryStatus.DELIVERED)).thenReturn(0L);
        when(collectionRepository.sumDeliveryCollectionsBySession(13L, State.ENABLED)).thenReturn(null);
        when(memberRepository.findTopCommercials(13L, State.ENABLED, PageRequest.of(0, 5))).thenReturn(List.of());

        SessionStatsDto stats = tontineSessionService.getSessionStats(13L);

        assertEquals(0.0, stats.getTotalCollected());
        assertEquals(0.0, stats.getAverageContribution());
        assertEquals(0.0, stats.getDeliveryRate());
        assertEquals(0.0, stats.getTotalDeliveryCollections());
    }

    @Test
    void getSessionStats_withCommercial_usesStrictCommercialAggregates() {
        TontineSession session = session(14L, 2026, 99_999.0);
        String commercial = "COM005";
        when(sessionRepository.findById(14L)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(null);
        when(memberRepository.countBySessionForCommercial(14L, State.ENABLED, commercial)).thenReturn(2L);
        when(memberRepository.sumTotalContributionBySessionForCommercial(14L, State.ENABLED, commercial))
                .thenReturn(40_000.0);
        when(memberRepository.countBySessionForCommercialAndDeliveryStatus(
                14L, State.ENABLED, TontineMemberDeliveryStatus.DELIVERED, commercial)).thenReturn(1L);
        when(collectionRepository.sumDeliveryCollectionsBySessionForCommercial(14L, State.ENABLED, commercial))
                .thenReturn(5_000.0);
        when(memberRepository.sumSocietyShareBySessionForCommercial(14L, State.ENABLED, commercial))
                .thenReturn(8_000.0);
        when(memberRepository.findTopCommercials(14L, State.ENABLED, PageRequest.of(0, 5))).thenReturn(List.of());

        SessionStatsDto stats = tontineSessionService.getSessionStats(14L, commercial);

        assertEquals(2, stats.getTotalMembers());
        assertEquals(40_000.0, stats.getTotalCollected());
        assertEquals(20_000.0, stats.getAverageContribution());
        assertEquals(1, stats.getDeliveredCount());
        assertEquals(1, stats.getPendingCount());
        assertEquals(50.0, stats.getDeliveryRate());
        assertEquals(8_000.0, stats.getTotalRevenue());
        assertEquals(5_000.0, stats.getTotalDeliveryCollections());
        verify(memberRepository, never()).countByTontineSessionIdAndState(any(), any());
    }

    @Test
    void getSessionStats_promoter_forcesOwnUsernameRegardlessOfRequestedCommercial() {
        TontineSession session = session(15L, 2026, 50_000.0);
        User promoter = mock(User.class);
        when(promoter.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(promoter.getUsername()).thenReturn("promoter.me");
        when(sessionRepository.findById(15L)).thenReturn(Optional.of(session));
        when(userService.getCurrentUser()).thenReturn(promoter);
        when(memberRepository.countBySessionForCommercial(eq(15L), eq(State.ENABLED), eq("promoter.me")))
                .thenReturn(1L);
        when(memberRepository.sumTotalContributionBySessionForCommercial(
                eq(15L), eq(State.ENABLED), eq("promoter.me"))).thenReturn(10_000.0);
        when(memberRepository.countBySessionForCommercialAndDeliveryStatus(
                eq(15L), eq(State.ENABLED), eq(TontineMemberDeliveryStatus.DELIVERED), eq("promoter.me")))
                .thenReturn(0L);
        when(collectionRepository.sumDeliveryCollectionsBySessionForCommercial(
                eq(15L), eq(State.ENABLED), eq("promoter.me"))).thenReturn(0.0);
        when(memberRepository.sumSocietyShareBySessionForCommercial(
                eq(15L), eq(State.ENABLED), eq("promoter.me"))).thenReturn(2_000.0);
        when(memberRepository.findTopCommercials(15L, State.ENABLED, PageRequest.of(0, 5))).thenReturn(List.of());

        SessionStatsDto stats = tontineSessionService.getSessionStats(15L, "other.commercial");

        assertEquals(1, stats.getTotalMembers());
        assertEquals(10_000.0, stats.getTotalCollected());
        assertEquals(2_000.0, stats.getTotalRevenue());
        verify(memberRepository, never()).countBySessionForCommercial(
                eq(15L), eq(State.ENABLED), eq("other.commercial"));
    }

    @Test
    void getSessionMembers_rejectsUnknownSessionBeforeQueryingMembers() {
        when(sessionRepository.existsById(99L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> tontineSessionService.getSessionMembers(99L, PageRequest.of(0, 20)));
        verify(memberRepository, never()).findByTontineSessionIdAndState(any(), any(), any());
    }

    @Test
    void compareSessions_calculatesGrowthAndFindsBestAndWorstYear() {
        TontineSession year2025 = session(25L, 2025, 0.0);
        TontineSession year2026 = session(26L, 2026, 0.0);
        when(sessionRepository.findByYear(2025)).thenReturn(Optional.of(year2025));
        when(sessionRepository.findByYear(2026)).thenReturn(Optional.of(year2026));
        when(memberRepository.findByTontineSessionIdAndState(25L, State.ENABLED))
                .thenReturn(List.of(member("commercial.a", 100.0, TontineMemberDeliveryStatus.DELIVERED)));
        when(memberRepository.findByTontineSessionIdAndState(26L, State.ENABLED))
                .thenReturn(List.of(
                        member("commercial.a", 150.0, TontineMemberDeliveryStatus.DELIVERED),
                        member("commercial.b", 150.0, TontineMemberDeliveryStatus.SESSION_INPROGRESS)));

        SessionComparisonDto comparison = tontineSessionService.compareSessions(List.of(2026, 2025));

        ComparisonMetricsDto metrics = comparison.getComparisonMetrics();
        assertEquals(2, comparison.getSessions().size());
        assertEquals(100.0, metrics.getMemberGrowth());
        assertEquals(200.0, metrics.getCollectionGrowth());
        assertEquals(2026, metrics.getBestYear());
        assertEquals(2025, metrics.getWorstYear());
    }

    private TontineSession session(Long id, int year, double totalRevenue) {
        TontineSession session = new TontineSession();
        session.setId(id);
        session.setYear(year);
        session.setTotalRevenue(totalRevenue);
        return session;
    }

    private TontineMember member(String collector, double contribution, TontineMemberDeliveryStatus status) {
        Client client = new Client();
        client.setCollector(collector);
        TontineMember member = new TontineMember();
        member.setClient(client);
        member.setTotalContribution(contribution);
        member.setDeliveryStatus(status);
        return member;
    }
}
