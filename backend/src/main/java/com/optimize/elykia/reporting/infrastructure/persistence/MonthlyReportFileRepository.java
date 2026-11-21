package com.optimize.elykia.reporting.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.reporting.domain.MonthlyReportFile;

import java.util.List;

public interface MonthlyReportFileRepository extends GenericRepository<MonthlyReportFile, Long> {
    List<MonthlyReportFile> findByRun_YearAndRun_MonthOrderByReportTypeAscCommercialUsernameAsc(Integer year, Integer month);
    List<MonthlyReportFile> findByRun_IdOrderByReportTypeAscCommercialUsernameAsc(Long runId);
    void deleteByRun_Id(Long runId);
}
