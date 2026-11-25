package com.optimize.elykia.commercialstock.infrastructure.persistence;

import com.optimize.elykia.commercialstock.api.CommercialStockRequestStatus;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.domain.CommercialStockRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CommercialStockRequestRepository extends JpaRepository<CommercialStockRequest, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM CommercialStockRequest r LEFT JOIN FETCH r.items WHERE r.id = :id")
    Optional<CommercialStockRequest> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT r FROM CommercialStockRequest r LEFT JOIN FETCH r.items WHERE r.id = :id")
    Optional<CommercialStockRequest> findByIdWithItems(@Param("id") Long id);

    Optional<CommercialStockRequest> findByLegacyCreditRequestId(Long legacyCreditRequestId);

    Optional<CommercialStockRequest> findByLegacyTontineRequestId(Long legacyTontineRequestId);

    Optional<CommercialStockRequest> findByReference(String reference);

    @Query("SELECT COALESCE(MAX(r.id), 0) FROM CommercialStockRequest r")
    Long findMaxId();

    @Query("""
            SELECT DISTINCT r FROM CommercialStockRequest r
            LEFT JOIN FETCH r.items
            WHERE (:agencyId IS NULL OR r.agencyId = :agencyId)
              AND (:activityType IS NULL OR r.activityType = :activityType)
              AND r.status IN :statuses
            ORDER BY r.requestDate ASC, r.id ASC
            """)
    List<CommercialStockRequest> findWithItemsByAgencyAndActivityAndStatuses(
            @Param("agencyId") Long agencyId,
            @Param("activityType") StockActivityType activityType,
            @Param("statuses") Collection<CommercialStockRequestStatus> statuses);

    @Query("""
            SELECT r FROM CommercialStockRequest r
            WHERE (:agencyId IS NULL OR r.agencyId = :agencyId)
              AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername)
              AND (:activityType IS NULL OR r.activityType = :activityType)
              AND (:status IS NULL OR r.status = :status)
              AND (CAST(:startDate AS date) IS NULL OR r.requestDate >= :startDate)
              AND (CAST(:endDate AS date) IS NULL OR r.requestDate <= :endDate)
            ORDER BY r.requestDate DESC, r.id DESC
            """)
    Page<CommercialStockRequest> search(
            @Param("agencyId") Long agencyId,
            @Param("commercialUsername") String commercialUsername,
            @Param("activityType") StockActivityType activityType,
            @Param("status") CommercialStockRequestStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);
}
