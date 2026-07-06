package com.optimize.elykia.core.service.report;

import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
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
