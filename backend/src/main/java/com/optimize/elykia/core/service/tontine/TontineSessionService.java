package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class TontineSessionService {

        private final TontineSessionRepository sessionRepository;
        private final TontineMemberRepository memberRepository;
        private final TontineCollectionRepository collectionRepository;
        private final UserService userService;

        /**
         * Récupère toutes les sessions avec leurs statistiques de base
         */
        public List<TontineSessionDto> getAllSessions() {
                log.info("Fetching all tontine sessions");

                List<TontineSession> sessions = sessionRepository.findAll();

                return sessions.stream()
                                .map(this::mapToSessionDto)
                                .sorted(Comparator.comparing(TontineSessionDto::getYear).reversed())
                                .collect(Collectors.toList());
        }

        /**
         * Récupère une session spécifique par son ID
         */
        public TontineSessionDto getSessionById(Long sessionId) {
                log.info("Fetching session with ID: {}", sessionId);

                TontineSession session = sessionRepository.findById(sessionId)
                                .orElseThrow(() -> new ResourceNotFoundException("Session non trouvée"));

                return mapToSessionDto(session);
        }

        /**
         * Récupère les membres d'une session spécifique avec pagination
         */
        public Page<TontineMember> getSessionMembers(Long sessionId, Pageable pageable) {
                log.info("Fetching members for session ID: {}", sessionId);

                // Vérifier que la session existe
                if (!sessionRepository.existsById(sessionId)) {
                        throw new ResourceNotFoundException("Session non trouvée");
                }

                return memberRepository.findByTontineSessionIdAndState(sessionId, State.ENABLED, pageable);
        }

        /**
         * Récupère les statistiques globales d'une session (exports Excel/PDF).
         */
        public SessionStatsDto getSessionStats(Long sessionId) {
                return getSessionStats(sessionId, null);
        }

        /**
         * Récupère les statistiques d'une session, éventuellement filtrées par commercial tontine.
         * Un promoteur est toujours limité à son propre portefeuille.
         */
        public SessionStatsDto getSessionStats(Long sessionId, String commercial) {
                log.info("Calculating statistics for session ID: {} (commercial={})", sessionId, commercial);

                TontineSession session = sessionRepository.findById(sessionId)
                                .orElseThrow(() -> new ResourceNotFoundException("Session non trouvée"));

                String commercialFilter = resolveCommercialFilter(commercial);

                final long totalMembers;
                final Double totalCollectedRaw;
                final long deliveredCount;
                final Double totalDeliveryCollectionsRaw;
                final Double totalRevenue;

                if (commercialFilter != null) {
                        totalMembers = memberRepository.countBySessionForCommercial(
                                        sessionId, State.ENABLED, commercialFilter);
                        totalCollectedRaw = memberRepository.sumTotalContributionBySessionForCommercial(
                                        sessionId, State.ENABLED, commercialFilter);
                        deliveredCount = memberRepository.countBySessionForCommercialAndDeliveryStatus(
                                        sessionId, State.ENABLED, TontineMemberDeliveryStatus.DELIVERED,
                                        commercialFilter);
                        totalDeliveryCollectionsRaw = collectionRepository
                                        .sumDeliveryCollectionsBySessionForCommercial(
                                                        sessionId, State.ENABLED, commercialFilter);
                        Double societyShare = memberRepository.sumSocietyShareBySessionForCommercial(
                                        sessionId, State.ENABLED, commercialFilter);
                        totalRevenue = societyShare != null ? societyShare : 0.0;
                } else {
                        totalMembers = memberRepository.countByTontineSessionIdAndState(sessionId, State.ENABLED);
                        totalCollectedRaw = memberRepository.sumTotalContributionByTontineSessionId(
                                        sessionId, State.ENABLED);
                        deliveredCount = memberRepository.countByTontineSessionIdAndStateAndDeliveryStatus(
                                        sessionId, State.ENABLED, TontineMemberDeliveryStatus.DELIVERED);
                        totalDeliveryCollectionsRaw = collectionRepository.sumDeliveryCollectionsBySession(
                                        sessionId, State.ENABLED);
                        totalRevenue = session.getTotalRevenue() != null ? session.getTotalRevenue() : 0.0;
                }

                Double totalCollected = totalCollectedRaw != null ? totalCollectedRaw : 0.0;
                Double totalDeliveryCollections = totalDeliveryCollectionsRaw != null
                                ? totalDeliveryCollectionsRaw
                                : 0.0;

                int pendingCount = (int) totalMembers - (int) deliveredCount;

                Double averageContribution = totalMembers > 0
                                ? totalCollected / totalMembers
                                : 0.0;

                Double deliveryRate = totalMembers > 0
                                ? (deliveredCount * 100.0) / totalMembers
                                : 0.0;

                // Top commerciaux via DB query (session-wide, not used by dashboard KPI cards)
                List<TopCommercialDto> topCommercials = memberRepository.findTopCommercials(sessionId, State.ENABLED,
                                org.springframework.data.domain.PageRequest.of(0, 5));

                return SessionStatsDto.builder()
                                .sessionId(sessionId)
                                .year(session.getYear())
                                .totalMembers((int) totalMembers)
                                .totalCollected(totalCollected)
                                .averageContribution(averageContribution)
                                .deliveredCount((int) deliveredCount)
                                .pendingCount(pendingCount)
                                .deliveryRate(deliveryRate)
                                .totalRevenue(totalRevenue)
                                .totalDeliveryCollections(totalDeliveryCollections)
                                .topCommercials(topCommercials)
                                .build();
        }

        private String resolveCommercialFilter(String commercial) {
                User currentUser = userService != null ? userService.getCurrentUser() : null;
                if (currentUser != null && currentUser.is(UserProfilConstant.PROMOTER)) {
                        return currentUser.getUsername();
                }
                if (!StringUtils.hasText(commercial) || "ALL".equalsIgnoreCase(commercial.trim())) {
                        return null;
                }
                return commercial.trim();
        }

        /**
         * Compare plusieurs sessions
         */
        public SessionComparisonDto compareSessions(List<Integer> years) {
                log.info("Comparing sessions for years: {}", years);

                List<SessionSummaryDto> sessionSummaries = new ArrayList<>();

                for (Integer year : years) {
                        Optional<TontineSession> sessionOpt = sessionRepository.findByYear(year);

                        if (sessionOpt.isPresent()) {
                                TontineSession session = sessionOpt.get();
                                List<TontineMember> members = memberRepository.findByTontineSessionIdAndState(
                                                session.getId(),
                                                State.ENABLED);

                                SessionSummaryDto summary = calculateSessionSummary(session, members);
                                sessionSummaries.add(summary);
                        }
                }

                // Calculer les métriques de comparaison
                ComparisonMetricsDto metrics = calculateComparisonMetrics(sessionSummaries);

                return SessionComparisonDto.builder()
                                .sessions(sessionSummaries)
                                .comparisonMetrics(metrics)
                                .build();
        }

        /**
         * Calcule le résumé d'une session
         */
        private SessionSummaryDto calculateSessionSummary(TontineSession session, List<TontineMember> members) {
                int totalMembers = members.size();

                Double totalCollected = members.stream()
                                .mapToDouble(m -> m.getTotalContribution() != null ? m.getTotalContribution() : 0.0)
                                .sum();

                long deliveredCount = members.stream()
                                .filter(m -> m.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED)
                                .count();

                Double averageContribution = totalMembers > 0 ? totalCollected / totalMembers : 0.0;
                Double deliveryRate = totalMembers > 0 ? (deliveredCount * 100.0) / totalMembers : 0.0;

                // Trouver le top commercial
                String topCommercial = findTopCommercial(members);

                return SessionSummaryDto.builder()
                                .year(session.getYear())
                                .totalMembers(totalMembers)
                                .totalCollected(totalCollected)
                                .averageContribution(averageContribution)
                                .deliveryRate(deliveryRate)
                                .topCommercial(topCommercial)
                                .build();
        }

        /**
         * Calcule les métriques de comparaison entre sessions
         */
        private ComparisonMetricsDto calculateComparisonMetrics(List<SessionSummaryDto> sessions) {
                if (sessions.isEmpty()) {
                        return ComparisonMetricsDto.builder()
                                        .memberGrowth(0.0)
                                        .collectionGrowth(0.0)
                                        .build();
                }

                // Trier par année
                sessions.sort(Comparator.comparing(SessionSummaryDto::getYear));

                // Calculer la croissance
                Double memberGrowth = 0.0;
                Double collectionGrowth = 0.0;

                if (sessions.size() >= 2) {
                        SessionSummaryDto first = sessions.get(0);
                        SessionSummaryDto last = sessions.get(sessions.size() - 1);

                        if (first.getTotalMembers() > 0) {
                                memberGrowth = ((last.getTotalMembers() - first.getTotalMembers()) * 100.0)
                                                / first.getTotalMembers();
                        }

                        if (first.getTotalCollected() > 0) {
                                collectionGrowth = ((last.getTotalCollected() - first.getTotalCollected()) * 100.0)
                                                / first.getTotalCollected();
                        }
                }

                // Trouver la meilleure et la pire année (basé sur le montant collecté)
                SessionSummaryDto best = sessions.stream()
                                .max(Comparator.comparing(SessionSummaryDto::getTotalCollected))
                                .orElse(null);

                SessionSummaryDto worst = sessions.stream()
                                .min(Comparator.comparing(SessionSummaryDto::getTotalCollected))
                                .orElse(null);

                return ComparisonMetricsDto.builder()
                                .memberGrowth(memberGrowth)
                                .collectionGrowth(collectionGrowth)
                                .bestYear(best != null ? best.getYear() : null)
                                .worstYear(worst != null ? worst.getYear() : null)
                                .build();
        }

        /**
         * Trouve le top commercial d'une session
         */
        private String findTopCommercial(List<TontineMember> members) {
                Map<String, Double> collectionByCommercial = members.stream()
                                .filter(m -> m.getClient() != null && m.getClient().getCollector() != null)
                                .collect(Collectors.groupingBy(
                                                m -> m.getClient().getCollector(),
                                                Collectors.summingDouble(
                                                                m -> m.getTotalContribution() != null
                                                                                ? m.getTotalContribution()
                                                                                : 0.0)));

                return collectionByCommercial.entrySet().stream()
                                .max(Map.Entry.comparingByValue())
                                .map(Map.Entry::getKey)
                                .orElse("N/A");
        }

        /**
         * Mappe une session vers son DTO
         */
        private TontineSessionDto mapToSessionDto(TontineSession session) {
                long memberCount = memberRepository.countByTontineSessionIdAndState(session.getId(), State.ENABLED);
                Double totalCollected = memberRepository.sumTotalContributionByTontineSessionId(session.getId(),
                                State.ENABLED);

                if (totalCollected == null) {
                        totalCollected = 0.0;
                }

                return TontineSessionDto.builder()
                                .id(session.getId())
                                .year(session.getYear())
                                .startDate(session.getStartDate())
                                .endDate(session.getEndDate())
                                .status(session.getStatus().name())
                                .memberCount((int) memberCount)
                                .totalCollected(totalCollected)
                                .totalRevenue(session.getTotalRevenue())
                                .build();
        }
}
