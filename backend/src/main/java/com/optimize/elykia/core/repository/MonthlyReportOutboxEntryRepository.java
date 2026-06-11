package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.MonthlyReportOutboxEntry;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;

import java.util.List;

public interface MonthlyReportOutboxEntryRepository extends GenericRepository<MonthlyReportOutboxEntry, Long> {
    List<MonthlyReportOutboxEntry> findByStatusInAndRetryCountLessThan(List<MonthlyReportOutboxStatus> statuses, Integer retryCount);
    long countByRun_IdAndStatus(Long runId, MonthlyReportOutboxStatus status);
    List<MonthlyReportOutboxEntry> findByRun_Id(Long runId);
    void deleteByRun_Id(Long runId);
}
