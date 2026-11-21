package com.optimize.elykia.reporting.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.reporting.domain.MonthlyReportOutboxEntry;
import com.optimize.elykia.shared.domain.MonthlyReportOutboxStatus;

import java.util.List;

public interface MonthlyReportOutboxEntryRepository extends GenericRepository<MonthlyReportOutboxEntry, Long> {
    List<MonthlyReportOutboxEntry> findByStatusInAndRetryCountLessThan(List<MonthlyReportOutboxStatus> statuses, Integer retryCount);
    long countByRun_IdAndStatus(Long runId, MonthlyReportOutboxStatus status);
    List<MonthlyReportOutboxEntry> findByRun_Id(Long runId);
    void deleteByRun_Id(Long runId);
}
