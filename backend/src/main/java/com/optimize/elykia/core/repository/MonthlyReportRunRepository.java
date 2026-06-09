package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface MonthlyReportRunRepository extends GenericRepository<MonthlyReportRun, Long> {
    Optional<MonthlyReportRun> findByYearAndMonth(Integer year, Integer month);
    Page<MonthlyReportRun> findAllByOrderByCreatedDateDesc(Pageable pageable);
}
