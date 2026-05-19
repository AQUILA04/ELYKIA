package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.service.store.ArticlesService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MetricsScheduler {

    private final ArticlesService articlesService;

    /**
     * Met à jour les gauges Prometheus (rupture de stock, stock faible) toutes les 5 minutes
     */
    @Scheduled(cron = "0 */5 * * * *")
    public void updateStockMetricsGauges() {
        try {
            articlesService.getStockMetrics();
        } catch (Exception e) {
            log.error("Erreur lors de la mise à jour des gauges Prometheus", e);
        }
    }
}
