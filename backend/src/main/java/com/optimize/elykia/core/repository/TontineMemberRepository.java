package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.TontineMemberRespDto;
import com.optimize.elykia.core.entity.TontineMember;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

        @Query("SELECT SUM(tm.societyShare) FROM TontineMember tm WHERE tm.tontineSession.id = :sessionId AND tm.state = :state")
        Double sumSocietyShareByTontineSessionId(
                        @Param("sessionId") Long sessionId,
                        @Param("state") State state);

        long countByTontineSessionIdAndState(Long sessionId, State state);

        long countByTontineSessionIdAndStateAndDeliveryStatus(Long sessionId, State state,
                        TontineMemberDeliveryStatus deliveryStatus);

        @Query("SELECT new com.optimize.elykia.core.dto.TopCommercialDto(tm.client.collector, COUNT(tm), SUM(tm.totalContribution)) "
                        +
                        "FROM TontineMember tm " +
                        "WHERE tm.tontineSession.id = :sessionId AND tm.state = :state AND tm.client.collector IS NOT NULL "
                        +
                        "GROUP BY tm.client.collector " +
                        "ORDER BY SUM(tm.totalContribution) DESC")
        List<com.optimize.elykia.core.dto.TopCommercialDto> findTopCommercials(
                        @Param("sessionId") Long sessionId,
                        @Param("state") State state, Pageable pageable);

        @Query("SELECT SUM(tm.totalContribution) FROM TontineMember tm WHERE tm.tontineSession.id = :sessionId AND tm.state = :state")
        Double sumTotalContributionByTontineSessionId(
                        @Param("sessionId") Long sessionId,
                        @Param("state") State state);

        @Query("""
        SELECT new com.optimize.elykia.core.dto.TontineMemberRespDto(
            tm.id,
            s,
            new com.optimize.elykia.client.dto.ClientRespDto(
                c.id, c.firstname, c.lastname, c.address, c.phone, c.cardID, 
                c.cardType, c.dateOfBirth, null, null, null, c.collector, 
                c.quarter, c.creditInProgress, c.occupation, c.clientType, 
                null, null, null, null, c.code, c.profilPhotoUrl, 
                c.cardPhotoUrl, c.tontineCollector, c.createdDate
            ),
            tm.totalContribution,
            tm.deliveryStatus,
            tm.registrationDate,
            new com.optimize.elykia.core.dto.TontineDeliveryRespDto(
                d.id, null, d.deliveryDate, d.requestDate, d.totalAmount, 
                d.remainingBalance, d.commercialUsername, null
            ),
            tm.frequency,
            tm.amount,
            tm.notes,
            tm.societyShare,
            tm.availableContribution,
            tm.validatedMonths,
            tm.currentMonthDays
        )
        FROM TontineMember tm
        LEFT JOIN tm.tontineSession s
        LEFT JOIN tm.client c
        LEFT JOIN tm.delivery d
        WHERE s.year = :year
        AND (:commercial IS NULL OR c.tontineCollector = :commercial)
        AND (:deliveryStatus IS NULL OR tm.deliveryStatus = :deliveryStatus)
        """)
        Page<TontineMemberRespDto> findMembersDto(
                @Param("year") Integer year,
                @Param("commercial") String commercial,
                @Param("deliveryStatus") TontineMemberDeliveryStatus deliveryStatus,
                Pageable pageable);



        @Query("""
        SELECT new com.optimize.elykia.core.dto.TontineMemberRespDto(
            tm.id,
            s,
            new com.optimize.elykia.client.dto.ClientRespDto(
                c.id, c.firstname, c.lastname, c.address, c.phone, c.cardID, 
                c.cardType, c.dateOfBirth, null, null, null, c.collector, 
                c.quarter, c.creditInProgress, c.occupation, c.clientType, 
                null, null, null, null, c.code, c.profilPhotoUrl, 
                c.cardPhotoUrl, c.tontineCollector, c.createdDate
            ),
            tm.totalContribution,
            tm.deliveryStatus,
            tm.registrationDate,
            new com.optimize.elykia.core.dto.TontineDeliveryRespDto(
                d.id, null, d.deliveryDate, d.requestDate, d.totalAmount, 
                d.remainingBalance, d.commercialUsername, null
            ),
            tm.frequency,
            tm.amount,
            tm.notes,
            tm.societyShare,
            tm.availableContribution,
            tm.validatedMonths,
            tm.currentMonthDays
        )
        FROM TontineMember tm
        LEFT JOIN tm.tontineSession s
        LEFT JOIN tm.client c
        LEFT JOIN tm.delivery d
        WHERE s.year = :year
        AND (:commercial IS NULL OR c.tontineCollector = :commercial)
        AND (:search IS NULL OR LOWER(c.firstname) LIKE LOWER(CONCAT('%', :search, '%')) 
                OR LOWER(c.lastname) LIKE LOWER(CONCAT('%', :search, '%')) 
                OR LOWER(c.phone) LIKE LOWER(CONCAT('%', :search, '%')) 
                OR LOWER(c.code) LIKE LOWER(CONCAT('%', :search, '%')))     
        AND (:deliveryStatus IS NULL OR tm.deliveryStatus = :deliveryStatus)
        """)
        Page<TontineMemberRespDto> findMembersDtoWithSearch(
                @Param("year") Integer year,
                @Param("commercial") String commercial,
                @Param("search") String search,
                @Param("deliveryStatus") TontineMemberDeliveryStatus deliveryStatus,
                Pageable pageable);
}
