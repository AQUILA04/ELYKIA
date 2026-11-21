package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.RecoveryManagerOperation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecoveryManagerOperationRepository extends GenericRepository<RecoveryManagerOperation, Long> {

    boolean existsByCreditIdAndOperationDate(Long creditId, LocalDate operationDate);

    boolean existsByReference(String reference);

    Optional<RecoveryManagerOperation> findByReference(String reference);

    @Query("SELECT r FROM RecoveryManagerOperation r " +
            "WHERE r.operationDate BETWEEN :startDate AND :endDate " +
            "AND (:recoveryManagerUsername IS NULL OR r.recoveryManagerUsername = :recoveryManagerUsername) " +
            "AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername)")
    Page<RecoveryManagerOperation> findByFilters(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("recoveryManagerUsername") String recoveryManagerUsername,
            @Param("commercialUsername") String commercialUsername,
            Pageable pageable);

    @Query("SELECT r.commercialUsername, COUNT(r), SUM(r.amountCollected) FROM RecoveryManagerOperation r " +
            "WHERE r.operationDate BETWEEN :startDate AND :endDate " +
            "AND (:recoveryManagerUsername IS NULL OR r.recoveryManagerUsername = :recoveryManagerUsername) " +
            "AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername) " +
            "GROUP BY r.commercialUsername")
    List<Object[]> findRemittanceByCommercial(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("recoveryManagerUsername") String recoveryManagerUsername,
            @Param("commercialUsername") String commercialUsername);

    @Query("SELECT COUNT(DISTINCT r.commercialUsername) FROM RecoveryManagerOperation r " +
            "WHERE r.operationDate BETWEEN :startDate AND :endDate " +
            "AND (:recoveryManagerUsername IS NULL OR r.recoveryManagerUsername = :recoveryManagerUsername) " +
            "AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername)")
    Integer countDistinctCommercials(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("recoveryManagerUsername") String recoveryManagerUsername,
            @Param("commercialUsername") String commercialUsername);

    @Query("SELECT COALESCE(SUM(r.amountCollected), 0) FROM RecoveryManagerOperation r " +
            "WHERE r.operationDate BETWEEN :startDate AND :endDate " +
            "AND (:recoveryManagerUsername IS NULL OR r.recoveryManagerUsername = :recoveryManagerUsername) " +
            "AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername)")
    Double sumAmountCollected(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("recoveryManagerUsername") String recoveryManagerUsername,
            @Param("commercialUsername") String commercialUsername);

    @Query("SELECT COUNT(r) FROM RecoveryManagerOperation r " +
            "WHERE r.operationDate BETWEEN :startDate AND :endDate " +
            "AND (:recoveryManagerUsername IS NULL OR r.recoveryManagerUsername = :recoveryManagerUsername) " +
            "AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername)")
    Integer countOperations(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("recoveryManagerUsername") String recoveryManagerUsername,
            @Param("commercialUsername") String commercialUsername);

    @Query("SELECT COUNT(r) FROM RecoveryManagerOperation r " +
            "WHERE r.operationDate BETWEEN :startDate AND :endDate " +
            "AND (:recoveryManagerUsername IS NULL OR r.recoveryManagerUsername = :recoveryManagerUsername) " +
            "AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername) " +
            "AND r.isPartial = :partial")
    Integer countOperationsByPartial(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("recoveryManagerUsername") String recoveryManagerUsername,
            @Param("commercialUsername") String commercialUsername,
            @Param("partial") boolean partial);

    /** Recouvré par jour : date, nombre d'opérations, montant. Board de recouvrement (tendance). */
    @Query("SELECT r.operationDate, COUNT(r), COALESCE(SUM(r.amountCollected), 0) FROM RecoveryManagerOperation r " +
            "WHERE r.operationDate BETWEEN :startDate AND :endDate " +
            "AND (:recoveryManagerUsername IS NULL OR r.recoveryManagerUsername = :recoveryManagerUsername) " +
            "AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername) " +
            "GROUP BY r.operationDate")
    List<Object[]> sumByDay(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("recoveryManagerUsername") String recoveryManagerUsername,
            @Param("commercialUsername") String commercialUsername);

    /** Par chef : nom, nombre d'opérations, montant. Board de recouvrement (vue équipe). */
    @Query("SELECT r.recoveryManagerUsername, COUNT(r), COALESCE(SUM(r.amountCollected), 0) FROM RecoveryManagerOperation r " +
            "WHERE r.operationDate BETWEEN :startDate AND :endDate " +
            "AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername) " +
            "GROUP BY r.recoveryManagerUsername")
    List<Object[]> summarizeByRecoveryManager(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("commercialUsername") String commercialUsername);

    /** Dernière date d'opération de chaque chef, jusqu'à la date donnée incluse. */
    @Query("SELECT r.recoveryManagerUsername, MAX(r.operationDate) FROM RecoveryManagerOperation r " +
            "WHERE r.operationDate <= :endDate GROUP BY r.recoveryManagerUsername")
    List<Object[]> findLastOperationDateByRecoveryManager(@Param("endDate") LocalDate endDate);
}
