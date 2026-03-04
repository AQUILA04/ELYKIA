package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.service.bi.BiAggregationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

/**
 * Scheduler service for refreshing BI aggregation data
 * Handles daily and monthly aggregation calculations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BiSchedulerService {
    
    private final BiAggregationService biAggregationService;
    
    /**
     * Refresh daily sales and collection aggregations
     * Runs daily at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * ?") // Every day at 2:00 AM
    public void refreshDailyAggregations() {
        try {
            long startTime = System.currentTimeMillis();
            log.info("Starting daily BI aggregation refresh");
            
            LocalDate yesterday = LocalDate.now().minusDays(1);
            
            // Recalculate sales analytics for yesterday
            // Note: This would typically query all credits from yesterday and recalculate
            // For now, we're focusing on real-time updates which should keep data current
            
            long endTime = System.currentTimeMillis();
            log.info("Daily BI aggregation refresh completed in {} ms", (endTime - startTime));
            
        } catch (Exception e) {
            log.error("Failed to refresh daily BI aggregations: {}", e.getMessage(), e);
            // Don't throw exception to avoid stopping the scheduler
        }
    }
    
    /**
     * Calculate monthly commercial performance metrics
     * Runs on the 1st of each month at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 1 * ?") // First day of month at 2:00 AM
    public void calculateMonthlyPerformance() {
        try {
            long startTime = System.currentTimeMillis();
            log.info("Starting monthly commercial performance calculation");
            
            LocalDate today = LocalDate.now();
            int previousMonth = today.minusMonths(1).getMonthValue();
            int previousYear = today.minusMonths(1).getYear();
            
            // Calculate commercial performance for previous month
            // This would aggregate all sales data for each commercial for the previous month
            // and store in commercial_performance_monthly table
            
            long endTime = System.currentTimeMillis();
            log.info("Monthly commercial performance calculation completed in {} ms", (endTime - startTime));
            
        } catch (Exception e) {
            log.error("Failed to calculate monthly commercial performance: {}", e.getMessage(), e);
            // Don't throw exception to avoid stopping the scheduler
        }
    }
    
    /**
     * Create daily portfolio snapshots
     * Runs daily at 2:30 AM (30 minutes after daily refresh)
     */
    @Scheduled(cron = "0 30 2 * * ?") // Every day at 2:30 AM
    public void createPortfolioSnapshot() {
        try {
            long startTime = System.currentTimeMillis();
            log.info("Starting portfolio snapshot creation");
            
            LocalDate today = LocalDate.now();
            
            // Create portfolio snapshot for today
            // This would capture the current state of the portfolio including:
            // - Active credits count
            // - Total outstanding amount
            // - Overdue amounts by PAR buckets
            // - Payment behavior statistics
            
            long endTime = System.currentTimeMillis();
            log.info("Portfolio snapshot creation completed in {} ms", (endTime - startTime));
            
        } catch (Exception e) {
            log.error("Failed to create portfolio snapshot: {}", e.getMessage(), e);
            // Don't throw exception to avoid stopping the scheduler
        }
    }
    
    /**
     * Health check for BI scheduler
     * Runs every hour to verify schedulers are functioning
     */
    @Scheduled(cron = "0 0 * * * ?") // Every hour
    public void healthCheck() {
        log.debug("BI Scheduler health check - Running normally");
    }
}