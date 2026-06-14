package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.TontineCollectionRespDto;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TontineCollectionRepository extends GenericRepository<TontineCollection, Long> {

    Page<TontineCollection> findByTontineMember_Id(Long memberId, Pageable pageable);

    @Query("SELECT SUM(tc.amount) FROM TontineCollection tc WHERE tc.tontineMember.id = :memberId AND tc.isDeliveryCollection = true AND tc.state = :state")
    Double sumDeliveryCollectionsByMember(@Param("memberId") Long memberId, @Param("state") State state);

    @Query("SELECT SUM(tc.amount) FROM TontineCollection tc WHERE tc.tontineMember.tontineSession.id = :sessionId AND tc.isDeliveryCollection = true AND tc.state = :state")
    Double sumDeliveryCollectionsBySession(@Param("sessionId") Long sessionId, @Param("state") State state);

    boolean existsByReference(String reference);
    Optional<TontineCollection> findByReference(String reference);

    @Query("SELECT new com.optimize.elykia.core.dto.TontineCollectionRespDto(" +
           "tc.id, " +
           "tm.id, " +
           "tc.amount, " +
           "tc.collectionDate, " +
           "tc.commercialUsername, " +
           "tc.isDeliveryCollection, " +
           "tc.reference, " +
           "tc.operationConsentCode, " +
           "tc.confirmedAmount, " +
           "tc.syncConsentCode) " +
           "FROM TontineCollection tc " +
           "JOIN tc.tontineMember tm " +
           "JOIN tm.tontineSession s " +
           "WHERE s.year = :year " +
           "AND (:commercial IS NULL OR tc.commercialUsername = :commercial) " +
           "AND tc.state = :state")
    Page<TontineCollectionRespDto> findCollectionsDto(
            @Param("year") Integer year,
            @Param("commercial") String commercial,
            @Param("state") State state,
            Pageable pageable);

    @Query("SELECT new com.optimize.elykia.core.dto.TontineCollectionWebDto(" +
            "tc.id, tc.reference, CONCAT(cl.firstname, ' ', cl.lastname), tc.commercialUsername, " +
            "tc.amount, tc.collectionDate, tc.operationConsentCode, tc.confirmedAmount, tc.syncConsentCode) " +
            "FROM TontineCollection tc " +
            "LEFT JOIN tc.tontineMember tm " +
            "LEFT JOIN tm.client cl " +
            "WHERE tc.collectionDate >= :dateFrom " +
            "AND tc.collectionDate <= :dateTo")
    Page<com.optimize.elykia.core.dto.TontineCollectionWebDto> findWebDtosByDateRange(
            @Param("dateFrom") java.time.LocalDateTime dateFrom,
            @Param("dateTo") java.time.LocalDateTime dateTo,
            Pageable pageable);

    @Query("SELECT new com.optimize.elykia.core.dto.TontineCollectionWebDto(" +
            "tc.id, tc.reference, CONCAT(cl.firstname, ' ', cl.lastname), tc.commercialUsername, " +
            "tc.amount, tc.collectionDate, tc.operationConsentCode, tc.confirmedAmount, tc.syncConsentCode) " +
            "FROM TontineCollection tc " +
            "LEFT JOIN tc.tontineMember tm " +
            "LEFT JOIN tm.client cl " +
            "WHERE tc.commercialUsername = :commercial " +
            "AND tc.collectionDate >= :dateFrom " +
            "AND tc.collectionDate <= :dateTo")
    Page<com.optimize.elykia.core.dto.TontineCollectionWebDto> findWebDtosByCommercialAndDateRange(
            @Param("commercial") String commercial,
            @Param("dateFrom") java.time.LocalDateTime dateFrom,
            @Param("dateTo") java.time.LocalDateTime dateTo,
            Pageable pageable);

    @Query("SELECT sum(tc.amount) FROM TontineCollection tc " +
            "WHERE tc.collectionDate >= :dateFrom AND tc.collectionDate <= :dateTo")
    Double sumAmountByDateRange(
            @Param("dateFrom") java.time.LocalDateTime dateFrom,
            @Param("dateTo") java.time.LocalDateTime dateTo);

    @Query("SELECT count(tc.id) FROM TontineCollection tc " +
            "WHERE tc.collectionDate >= :dateFrom AND tc.collectionDate <= :dateTo")
    Long countCollectionsByDateRange(
            @Param("dateFrom") java.time.LocalDateTime dateFrom,
            @Param("dateTo") java.time.LocalDateTime dateTo);

    @Query("SELECT sum(tc.amount) FROM TontineCollection tc " +
            "WHERE tc.commercialUsername = :commercial " +
            "AND tc.collectionDate >= :dateFrom AND tc.collectionDate <= :dateTo")
    Double sumAmountByCommercialAndDateRange(
            @Param("commercial") String commercial,
            @Param("dateFrom") java.time.LocalDateTime dateFrom,
            @Param("dateTo") java.time.LocalDateTime dateTo);

    @Query("SELECT count(tc.id) FROM TontineCollection tc " +
            "WHERE tc.commercialUsername = :commercial " +
            "AND tc.collectionDate >= :dateFrom AND tc.collectionDate <= :dateTo")
    Long countCollectionsByCommercialAndDateRange(
            @Param("commercial") String commercial,
            @Param("dateFrom") java.time.LocalDateTime dateFrom,
            @Param("dateTo") java.time.LocalDateTime dateTo);

    @Query("SELECT tc FROM TontineCollection tc " +
            "JOIN FETCH tc.tontineMember tm " +
            "JOIN FETCH tm.client c " +
            "JOIN tm.tontineSession s " +
            "WHERE s.id = :sessionId AND tc.state = com.optimize.common.entities.enums.State.ENABLED " +
            "ORDER BY c.tontineCollector, c.quarter, tc.collectionDate")
    java.util.List<TontineCollection> findAllBySessionId(@Param("sessionId") Long sessionId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @Query("DELETE FROM TontineCollection tc WHERE tc.tontineMember.tontineSession.id = :sessionId")
    void deleteAllBySessionId(@Param("sessionId") Long sessionId);
}
