package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.MonthlyReportSnapshot;

import java.util.Optional;

public interface MonthlyReportSnapshotRepository extends GenericRepository<MonthlyReportSnapshot, Long> {
    Optional<MonthlyReportSnapshot> findTopByRun_IdOrderByCreatedDateDesc(Long runId);
}
