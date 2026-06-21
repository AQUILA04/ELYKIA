package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.CashPeriodRemittance;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CashPeriodRemittanceRepository extends GenericRepository<CashPeriodRemittance, Long> {
    Optional<CashPeriodRemittance> findByYearAndMonth(Integer year, Integer month);

    boolean existsByYearAndMonth(Integer year, Integer month);

    boolean existsByYearAndMonthAndStatus(Integer year, Integer month,
            com.optimize.elykia.core.enumaration.RemittanceStatus status);
}
