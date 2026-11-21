package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.sale.domain.SaleCancellationOutboxEntry;
import com.optimize.elykia.shared.domain.MonthlyReportOutboxStatus;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaleCancellationOutboxEntryRepository extends GenericRepository<SaleCancellationOutboxEntry, Long> {

    List<SaleCancellationOutboxEntry> findByStatusInAndRetryCountLessThan(
            List<MonthlyReportOutboxStatus> statuses,
            int maxRetries);
}
