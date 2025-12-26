package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.service.CommercialPerformanceService;
import com.optimize.elykia.core.service.DailyBusinessSnapshotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Scheduler pour les tâches BI automatiques
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BiScheduler {
    
    private final DailyBusinessSnapshotService snapshotService;
    private final CommercialPerformanceService performanceService;
    
    /**
     * Génère le snapshot quotidien tous les jours à 1h du matin
     */
    @Scheduled(cron = "0 0 1 * * *")
    public void generateDailySnapshot() {
        try {
            log.info("Génération du snapshot quotidien...");
            LocalDate yesterday = LocalDate.now().minusDays(1);
            snapshotService.generateSnapshot(yesterday);
            log.info("Snapshot quotidien généré avec succès pour {}", yesterday);
        } catch (Exception e) {
            log.error("Erreur lors de la génération du snapshot quotidien", e);
        }
    }
    
    /**
     * Calcule les performances commerciales mensuelles le 1er de chaque mois à 2h
     */
    @Scheduled(cron = "0 0 2 1 * *")
    public void calculateMonthlyPerformances() {
        try {
            log.info("Calcul des performances commerciales mensuelles...");
            LocalDate lastMonth = LocalDate.now().minusMonths(1);
            LocalDate startOfMonth = lastMonth.withDayOfMonth(1);
            LocalDate endOfMonth = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth());
            
            performanceService.calculateAllPerformances(startOfMonth, endOfMonth);
            log.info("Performances commerciales calculées pour la période {} - {}", startOfMonth, endOfMonth);
        } catch (Exception e) {
            log.error("Erreur lors du calcul des performances commerciales", e);
        }
    }
    
    /**
     * Calcule les performances hebdomadaires tous les lundis à 3h
     */
    @Scheduled(cron = "0 0 3 * * MON")
    public void calculateWeeklyPerformances() {
        try {
            log.info("Calcul des performances commerciales hebdomadaires...");
            LocalDate lastWeekEnd = LocalDate.now().minusWeeks(1);
            LocalDate startOfWeek = lastWeekEnd.minusDays(6);
            
            performanceService.calculateAllPerformances(startOfWeek, lastWeekEnd);
            log.info("Performances commerciales hebdomadaires calculées pour {} - {}", startOfWeek, lastWeekEnd);
        } catch (Exception e) {
            log.error("Erreur lors du calcul des performances hebdomadaires", e);
        }
    }
}
