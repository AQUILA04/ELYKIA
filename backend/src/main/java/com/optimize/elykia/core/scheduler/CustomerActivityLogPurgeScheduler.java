package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.service.customer.CustomerActivityLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class CustomerActivityLogPurgeScheduler {

    private final CustomerActivityLogService activityLogService;

    /** Tous les jours à 03:40. */
    @Scheduled(cron = "0 40 3 * * *")
    public void purge() {
        int deleted = activityLogService.purgeExpired();
        if (deleted > 0) {
            log.info("Purged {} customer activity log rows", deleted);
        }
    }
}
