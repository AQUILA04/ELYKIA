package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.AgencyWeeklyReport;
import com.optimize.elykia.core.enumaration.WeekStatus;

import java.util.Optional;

public interface AgencyWeeklyReportRepository extends GenericRepository<AgencyWeeklyReport, Long> {

    Optional<AgencyWeeklyReport> findByStatusAndAgency_id(WeekStatus status, Long agencyId);
}
