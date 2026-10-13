package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.CashSurplusReallocation;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CashSurplusReallocationRepository extends GenericRepository<CashSurplusReallocation, Long> {

    @Query("""
            SELECT r FROM CashSurplusReallocation r
            LEFT JOIN FETCH r.lines
            WHERE UPPER(r.commercialUsername) = UPPER(:commercialUsername)
              AND r.periodStart <= :endDate
              AND r.periodEnd >= :startDate
            """)
    List<CashSurplusReallocation> findOverlappingPeriod(
            @Param("commercialUsername") String commercialUsername,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
