package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.TontineMember;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface TontineMemberRepository extends GenericRepository<TontineMember, Long> {

        Optional<TontineMember> findByTontineSession_YearAndClient_Id(Integer year, Long clientId);

        Page<TontineMember> findByTontineSession_YearAndClient_Collector(Integer year, String collectorUsername,
                        Pageable pageable);

        Page<TontineMember> findByTontineSession_Year(Integer year, Pageable pageable);

        // Méthodes pour les sessions historiques
        List<TontineMember> findByTontineSessionIdAndState(Long sessionId, State state);

        Page<TontineMember> findByTontineSessionIdAndState(Long sessionId, State state, Pageable pageable);

        Page<TontineMember> findByDeliveryStatus(TontineMemberDeliveryStatus status, Pageable pageable);

        @org.springframework.data.jpa.repository.Query("SELECT SUM(tm.societyShare) FROM TontineMember tm WHERE tm.tontineSession.id = :sessionId AND tm.state = :state")
        Double sumSocietyShareByTontineSessionId(
                        @org.springframework.data.repository.query.Param("sessionId") Long sessionId,
                        @org.springframework.data.repository.query.Param("state") State state);

        long countByTontineSessionIdAndState(Long sessionId, State state);

        long countByTontineSessionIdAndStateAndDeliveryStatus(Long sessionId, State state,
                        TontineMemberDeliveryStatus deliveryStatus);

        @org.springframework.data.jpa.repository.Query("SELECT new com.optimize.elykia.core.dto.TopCommercialDto(tm.client.collector, COUNT(tm), SUM(tm.totalContribution)) "
                        +
                        "FROM TontineMember tm " +
                        "WHERE tm.tontineSession.id = :sessionId AND tm.state = :state AND tm.client.collector IS NOT NULL "
                        +
                        "GROUP BY tm.client.collector " +
                        "ORDER BY SUM(tm.totalContribution) DESC")
        List<com.optimize.elykia.core.dto.TopCommercialDto> findTopCommercials(
                        @org.springframework.data.repository.query.Param("sessionId") Long sessionId,
                        @org.springframework.data.repository.query.Param("state") State state, Pageable pageable);

        @org.springframework.data.jpa.repository.Query("SELECT SUM(tm.totalContribution) FROM TontineMember tm WHERE tm.tontineSession.id = :sessionId AND tm.state = :state")
        Double sumTotalContributionByTontineSessionId(
                        @org.springframework.data.repository.query.Param("sessionId") Long sessionId,
                        @org.springframework.data.repository.query.Param("state") State state);
}
