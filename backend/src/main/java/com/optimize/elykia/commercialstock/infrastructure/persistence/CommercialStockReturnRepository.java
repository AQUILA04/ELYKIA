package com.optimize.elykia.commercialstock.infrastructure.persistence;

import com.optimize.elykia.commercialstock.api.CommercialStockReturnStatus;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.domain.CommercialStockReturn;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface CommercialStockReturnRepository extends JpaRepository<CommercialStockReturn, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM CommercialStockReturn r LEFT JOIN FETCH r.items WHERE r.id = :id")
    Optional<CommercialStockReturn> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT r FROM CommercialStockReturn r LEFT JOIN FETCH r.items WHERE r.id = :id")
    Optional<CommercialStockReturn> findByIdWithItems(@Param("id") Long id);

    Optional<CommercialStockReturn> findByLegacyCreditReturnId(Long legacyCreditReturnId);

    Optional<CommercialStockReturn> findByLegacyTontineReturnId(Long legacyTontineReturnId);

    @Query("SELECT COALESCE(MAX(r.id), 0) FROM CommercialStockReturn r")
    Long findMaxId();

    @Query("""
            SELECT r FROM CommercialStockReturn r
            WHERE (:agencyId IS NULL OR r.agencyId = :agencyId)
              AND (:commercialUsername IS NULL OR r.commercialUsername = :commercialUsername)
              AND (:activityType IS NULL OR r.activityType = :activityType)
              AND (:status IS NULL OR r.status = :status)
              AND (CAST(:startDate AS date) IS NULL OR r.returnDate >= :startDate)
              AND (CAST(:endDate AS date) IS NULL OR r.returnDate <= :endDate)
            ORDER BY r.returnDate DESC, r.id DESC
            """)
    Page<CommercialStockReturn> search(
            @Param("agencyId") Long agencyId,
            @Param("commercialUsername") String commercialUsername,
            @Param("activityType") StockActivityType activityType,
            @Param("status") CommercialStockReturnStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);
}
