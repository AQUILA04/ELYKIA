package com.optimize.elykia.reporting.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.reporting.domain.MonthlyReportRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface MonthlyReportRunRepository extends GenericRepository<MonthlyReportRun, Long> {
    Optional<MonthlyReportRun> findByYearAndMonth(Integer year, Integer month);
    Page<MonthlyReportRun> findAllByOrderByCreatedDateDesc(Pageable pageable);
}
