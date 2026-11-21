package com.optimize.elykia.finance.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.finance.domain.AgencyWeeklyReport;
import com.optimize.elykia.finance.domain.WeekStatus;

import java.util.Optional;

public interface AgencyWeeklyReportRepository extends GenericRepository<AgencyWeeklyReport, Long> {

    Optional<AgencyWeeklyReport> findByStatusAndAgency_id(WeekStatus status, Long agencyId);
}
