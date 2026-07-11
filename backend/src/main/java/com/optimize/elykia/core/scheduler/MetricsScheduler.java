package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.service.store.ArticlesService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MetricsScheduler {

    private final ArticlesService articlesService;

    /**
     * Met à jour les gauges Prometheus toutes les 15 minutes (réduit la charge CPU continue).
     */
    @Scheduled(cron = "0 */15 * * * *")
    @SchedulerLock(name = "updateStockMetricsGauges", lockAtLeastFor = "PT30S", lockAtMostFor = "PT10M")
    public void updateStockMetricsGauges() {
        long start = System.currentTimeMillis();
        try {
            articlesService.getStockMetrics();
            log.debug("Gauges stock Prometheus mises à jour en {} ms", System.currentTimeMillis() - start);
        } catch (Exception e) {
            log.error("Erreur lors de la mise à jour des gauges Prometheus après {} ms", System.currentTimeMillis() - start, e);
        }
    }
}
