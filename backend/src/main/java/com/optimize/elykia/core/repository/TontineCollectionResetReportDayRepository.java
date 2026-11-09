package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.TontineCollectionResetReportDay;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TontineCollectionResetReportDayRepository
        extends GenericRepository<TontineCollectionResetReportDay, Long> {

    List<TontineCollectionResetReportDay> findByRun_IdOrderByReportDateAscIdAsc(Long runId);
}
