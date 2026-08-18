package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.TontineCommercialMemberExportProjectionDto;
import com.optimize.elykia.core.dto.TontineMemberRespDto;
import com.optimize.elykia.core.dto.customer.CustomerTontineContributionSummaryDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TontineMemberRepository extends GenericRepository<TontineMember, Long> {

        Optional<TontineMember> findByTontineSession_YearAndClient_Id(Integer year, Long clientId);
        List<TontineMember> findByClient_IdAndStateOrderByRegistrationDateDesc(Long clientId, State state);

        Page<TontineMember> findByTontineSession_YearAndClient_Collector(Integer year, String collectorUsername,
                        Pageable pageable);

        Page<TontineMember> findByTontineSession_Year(Integer year, Pageable pageable);

        @Query("""
                SELECT new com.optimize.elykia.core.dto.TontineCommercialMemberExportProjectionDto(
                    tm.id,
                    c.code,
                    c.firstname,
                    c.lastname,
                    c.quarter,
                    tm.totalContribution,
                    tm.societyShare,
                    tm.availableContribution
                )
                FROM TontineMember tm
                JOIN tm.client c
                JOIN tm.tontineSession s
                WHERE s.year = :year
                  AND c.tontineCollector = :commercial
                  AND tm.state = :state
                ORDER BY c.quarter ASC, c.lastname ASC, c.firstname ASC
                """)
        List<TontineCommercialMemberExportProjectionDto> findExportProjectionsBySessionYearAndTontineCollector(
                        @Param("year") Integer year,
                        @Param("commercial") String commercial,
                        @Param("state") State state);

        @Query("""
                SELECT tm FROM TontineMember tm
                JOIN FETCH tm.client c
                JOIN FETCH tm.tontineSession s
                WHERE s.year = :year
                  AND tm.state = :state
                  AND tm.deliveryStatus = com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus.SESSION_INPROGRESS
                  AND c.tontineCollector IN :collectors
                ORDER BY c.quarter ASC, c.lastname ASC, c.firstname ASC
                """)
        List<TontineMember> findActiveBySessionYearAndTontineCollectors(
                        @Param("year") Integer year,
                        @Param("collectors") List<String> collectors,
                        @Param("state") State state);

        @Query("""
        SELECT new com.optimize.elykia.core.dto.customer.CustomerTontineContributionSummaryDto(
            tm.id,
            tm.tontineSession.year,
            tm.deliveryStatus,
            tm.amount,
            tm.totalContribution,
            tm.societyShare,
            tm.availableContribution,
            tm.validatedMonths,
            tm.currentMonthDays,
            tm.registrationDate,
            tm.tontineSession.startDate,
            tm.tontineSession.endDate,
            tm.tontineSession.status
        )
        FROM TontineMember tm
        WHERE tm.client.id = :clientId
          AND tm.state = :state
        ORDER BY tm.registrationDate DESC
        """)
        List<CustomerTontineContributionSummaryDto> findCustomerContributionSummariesByClientId(
                @Param("clientId") Long clientId,
                @Param("state") State state);

        // Méthodes pour les sessions historiques
        List<TontineMember> findByTontineSessionIdAndState(Long sessionId, State state);

        Page<TontineMember> findByTontineSessionIdAndState(Long sessionId, State state, Pageable pageable);

        @Query("""
                SELECT tm FROM TontineMember tm
                WHERE tm.tontineSession.id = :sessionId
                  AND tm.state = :state
                  AND tm.id > :lastId
                ORDER BY tm.id ASC
                """)
        Page<TontineMember> findNextEnabledBySessionId(
                @Param("sessionId") Long sessionId,
                @Param("state") State state,
                @Param("lastId") Long lastId,
                Pageable pageable);

        @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
        @Query("UPDATE TontineMember tm SET tm.totalContribution = 0, tm.societyShare = 0, " +
                "tm.availableContribution = 0, tm.validatedMonths = 0, tm.currentMonthDays = 0 " +
                "WHERE tm.tontineSession.id = :sessionId AND tm.state = com.optimize.common.entities.enums.State.ENABLED")
        int resetContributionsBySessionId(@Param("sessionId") Long sessionId);

        @Query("SELECT COUNT(tm) FROM TontineMember tm " +
                "WHERE tm.tontineSession.id = :sessionId AND tm.state = com.optimize.common.entities.enums.State.ENABLED")
        long countEnabledBySessionId(@Param("sessionId") Long sessionId);

        @Query("""
                SELECT tm FROM TontineMember tm
                JOIN FETCH tm.client
                WHERE tm.id = :id
                """)
        java.util.Optional<TontineMember> findByIdWithClient(@Param("id") Long id);

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
                c.quarter, c.creditInProgress, c.businessCreditInProgress, c.businessCreditAuthorized,
                c.businessCreditAuthorizedBy, c.businessCreditAuthorizedAt, c.occupation, c.clientType, 
                null, null, null, null, c.code, c.profilPhotoUrl, 
                c.cardPhotoUrl, c.tontineCollector, c.createdDate, c.profilPhotoThumbUrl, c.cardPhotoThumbUrl
            ),
            tm.totalContribution,
            tm.deliveryStatus,
            tm.registrationDate,
            new com.optimize.elykia.core.dto.TontineDeliveryRespDto(
                d.id, null, d.deliveryDate, d.requestDate, d.totalAmount, 
                d.remainingBalance, d.commercialUsername, d.reference, null,
                d.operationConsentCode, d.syncConsentCode
            ),
            tm.frequency,
            tm.amount,
            tm.notes,
            tm.societyShare,
            tm.availableContribution,
            tm.validatedMonths,
            tm.currentMonthDays,
            tm.operationConsentCode,
            tm.syncConsentCode,
            null,
            tm.carnetVerified,
            tm.carnetVerifiedAt,
            tm.carnetVerifiedBy
        )
        FROM TontineMember tm
        LEFT JOIN tm.tontineSession s
        LEFT JOIN tm.client c
        LEFT JOIN tm.delivery d
        WHERE s.year = :year
        AND (:commercial IS NULL OR c.tontineCollector = :commercial)
        AND (:deliveryStatus IS NULL OR tm.deliveryStatus = :deliveryStatus)
        AND (:carnetVerified IS NULL OR tm.carnetVerified = :carnetVerified)
        """)
        Page<TontineMemberRespDto> findMembersDto(
                @Param("year") Integer year,
                @Param("commercial") String commercial,
                @Param("deliveryStatus") TontineMemberDeliveryStatus deliveryStatus,
                @Param("carnetVerified") Boolean carnetVerified,
                Pageable pageable);



        @Query("""
        SELECT new com.optimize.elykia.core.dto.TontineMemberRespDto(
            tm.id,
            s,
            new com.optimize.elykia.client.dto.ClientRespDto(
                c.id, c.firstname, c.lastname, c.address, c.phone, c.cardID, 
                c.cardType, c.dateOfBirth, null, null, null, c.collector, 
                c.quarter, c.creditInProgress, c.businessCreditInProgress, c.businessCreditAuthorized,
                c.businessCreditAuthorizedBy, c.businessCreditAuthorizedAt, c.occupation, c.clientType, 
                null, null, null, null, c.code, c.profilPhotoUrl, 
                c.cardPhotoUrl, c.tontineCollector, c.createdDate, c.profilPhotoThumbUrl, c.cardPhotoThumbUrl
            ),
            tm.totalContribution,
            tm.deliveryStatus,
            tm.registrationDate,
            new com.optimize.elykia.core.dto.TontineDeliveryRespDto(
                d.id, null, d.deliveryDate, d.requestDate, d.totalAmount, 
                d.remainingBalance, d.commercialUsername, d.reference, null,
                d.operationConsentCode, d.syncConsentCode
            ),
            tm.frequency,
            tm.amount,
            tm.notes,
            tm.societyShare,
            tm.availableContribution,
            tm.validatedMonths,
            tm.currentMonthDays,
            tm.operationConsentCode,
            tm.syncConsentCode,
            null,
            tm.carnetVerified,
            tm.carnetVerifiedAt,
            tm.carnetVerifiedBy
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
        AND (:carnetVerified IS NULL OR tm.carnetVerified = :carnetVerified)
        """)
        Page<TontineMemberRespDto> findMembersDtoWithSearch(
                @Param("year") Integer year,
                @Param("commercial") String commercial,
                @Param("search") String search,
                @Param("deliveryStatus") TontineMemberDeliveryStatus deliveryStatus,
                @Param("carnetVerified") Boolean carnetVerified,
                Pageable pageable);

        @Query("""
                SELECT tm FROM TontineMember tm
                JOIN FETCH tm.client c
                JOIN tm.tontineSession s
                WHERE s.year = :year
                  AND tm.state = :state
                  AND tm.carnetVerified = :verified
                  AND (:commercial IS NULL OR c.tontineCollector = :commercial)
                """)
        List<TontineMember> findForCarnetVerificationExport(
                @Param("year") Integer year,
                @Param("verified") boolean verified,
                @Param("commercial") String commercial,
                @Param("state") State state);
}
