package com.optimize.elykia.finance.application;

import com.optimize.elykia.finance.domain.DailyCommercialReport;
import com.optimize.elykia.finance.infrastructure.persistence.DailyCommercialReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DailyCommercialReportPersistence {

    private final DailyCommercialReportRepository repository;
    private final CommercialReportMonthlyService monthlyService;

    @Transactional
    public DailyCommercialReport save(DailyCommercialReport report) {
        DailyCommercialReport saved = repository.save(report);
        monthlyService.syncFromDailyReport(saved);
        return saved;
    }
}
