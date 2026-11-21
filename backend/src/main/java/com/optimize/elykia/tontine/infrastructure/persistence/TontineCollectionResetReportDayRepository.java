package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.tontine.domain.TontineCollectionResetReportDay;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TontineCollectionResetReportDayRepository
        extends GenericRepository<TontineCollectionResetReportDay, Long> {

    List<TontineCollectionResetReportDay> findByRun_IdOrderByReportDateAscIdAsc(Long runId);
}
