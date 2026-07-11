package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class CronManager {

    private final CreditRepository creditRepository;
    private final AccountingDayService accountingDayService;

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void updatePromoterCreditStatus() {
        long start = System.currentTimeMillis();
        int updated = creditRepository.updateDailyPaidForCredit();
        log.info("updatePromoterCreditStatus: {} crédit(s) remis à dailyPaid=false en {} ms", updated, System.currentTimeMillis() - start);
    }

    @Scheduled(cron = "0 5 0 * * *")
    @SchedulerLock(name = "rollForwardAccountingDay", lockAtLeastFor = "PT1M", lockAtMostFor = "PT30M")
    public void rollForwardAccountingDay() {
        long start = System.currentTimeMillis();
        log.info("Début bascule journée comptable");
        accountingDayService.ensureCurrentAccountingDay();
        log.info("Bascule journée comptable terminée en {} ms", System.currentTimeMillis() - start);
    }

}