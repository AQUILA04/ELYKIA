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

@Repository
public interface RecoveryManagerOperationRepository extends GenericRepository<RecoveryManagerOperation, Long> {

    boolean existsByCreditIdAndOperationDate(Long creditId, LocalDate operationDate);

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
}
