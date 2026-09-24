package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.SaleCancellationOutboxEntry;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaleCancellationOutboxEntryRepository extends GenericRepository<SaleCancellationOutboxEntry, Long> {

    List<SaleCancellationOutboxEntry> findByStatusInAndRetryCountLessThan(
            List<MonthlyReportOutboxStatus> statuses,
            int maxRetries);
}
