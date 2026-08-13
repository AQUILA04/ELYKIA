package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.CashPeriodRemittance;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CashPeriodRemittanceRepository extends GenericRepository<CashPeriodRemittance, Long> {
    Optional<CashPeriodRemittance> findByYearAndMonthAndStatus(Integer year, Integer month, RemittanceStatus status);

    boolean existsByYearAndMonthAndStatus(Integer year, Integer month, RemittanceStatus status);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(cpr.totalAmount), 0)
            FROM CashPeriodRemittance cpr
            WHERE cpr.year = :year
              AND cpr.month = :month
              AND cpr.status = com.optimize.elykia.core.enumaration.RemittanceStatus.RECEIVED
            """)
    Double sumReceivedTotalByYearAndMonth(
            @org.springframework.data.repository.query.Param("year") Integer year,
            @org.springframework.data.repository.query.Param("month") Integer month);
}
