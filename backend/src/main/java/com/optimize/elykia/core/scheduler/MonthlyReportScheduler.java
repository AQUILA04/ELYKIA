package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.service.report.monthly.MonthlyReportJobOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class MonthlyReportScheduler {

    private final MonthlyReportJobOrchestrator orchestrator;

    @Scheduled(cron = "0 0 2 1 * *")
    @SchedulerLock(name = "monthlyReportScheduler", lockAtLeastFor = "PT5M", lockAtMostFor = "PT2H")
    public void generateMonthlyReports() {
        LocalDate previousMonth = LocalDate.now().minusMonths(1);
        log.info("Lancement des rapports mensuels pour {}/{}", previousMonth.getMonthValue(), previousMonth.getYear());
        orchestrator.runMonthlyReport(previousMonth.getYear(), previousMonth.getMonthValue());
    }
}
