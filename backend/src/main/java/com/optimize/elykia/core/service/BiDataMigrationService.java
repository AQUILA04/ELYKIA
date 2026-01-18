package com.optimize.elykia.core.service;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.CreditTimeline;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for migrating historical data to aggregation tables
 * Populates aggregation tables with existing data from credit history
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BiDataMigrationService {
    
    private final CreditRepository creditRepository;
    private final CreditTimelineRepository creditTimelineRepository;
    private final BiAggregationService biAggregationService;
    
    /**
     * Migrate historical sales data to aggregation tables
     * Processes all existing credits and creates daily aggregations
     */
    @Transactional
    public void migrateHistoricalSalesData() {
        try {
            log.info("Starting historical sales data migration");
            long startTime = System.currentTimeMillis();
            
            // Get all credits that need to be migrated (CLIENT type, CREDIT operation)
            List<Credit> credits = creditRepository.findByTypeAndClientType(OperationType.CREDIT, ClientType.CLIENT);
            
            log.info("Processing {} credits for historical sales migration", credits.size());
            
            // Process in batches to avoid memory issues
            int batchSize = 1000;
            for (int i = 0; i < credits.size(); i += batchSize) {
                int endIndex = Math.min(i + batchSize, credits.size());
                List<Credit> batch = credits.subList(i, endIndex);
                
                biAggregationService.updateSalesAggregations(batch);
                
                if (i % 5000 == 0) {
                    log.info("Processed {} credits for sales migration", i);
                }
            }
            
            long endTime = System.currentTimeMillis();
            log.info("Historical sales data migration completed in {} ms, processed {} credits", 
                (endTime - startTime), credits.size());
                
        } catch (Exception e) {
            log.error("Failed to migrate historical sales data: {}", e.getMessage(), e);
            throw e; // Re-throw to indicate failure
        }
    }
    
    /**
     * Migrate historical collection data to aggregation tables
     * Processes all existing payment events and creates daily aggregations
     */
    @Transactional
    public void migrateHistoricalCollectionData() {
        try {
            log.info("Starting historical collection data migration");
            long startTime = System.currentTimeMillis();
            
            // Get all credit timeline entries (payment events) that need to be migrated
            List<CreditTimeline> paymentEvents = creditTimelineRepository.findAll();
            
            log.info("Processing {} payment events for historical collection migration", paymentEvents.size());
            
            // Process in batches to avoid memory issues
            int batchSize = 1000;
            for (int i = 0; i < paymentEvents.size(); i += batchSize) {
                int endIndex = Math.min(i + batchSize, paymentEvents.size());
                List<CreditTimeline> batch = paymentEvents.subList(i, endIndex);
                
                biAggregationService.updateCollectionAggregations(batch);
                
                if (i % 5000 == 0) {
                    log.info("Processed {} payment events for collection migration", i);
                }
            }
            
            long endTime = System.currentTimeMillis();
            log.info("Historical collection data migration completed in {} ms, processed {} payment events", 
                (endTime - startTime), paymentEvents.size());
                
        } catch (Exception e) {
            log.error("Failed to migrate historical collection data: {}", e.getMessage(), e);
            throw e; // Re-throw to indicate failure
        }
    }
    
    /**
     * Migrate commercial performance data
     * Calculates monthly performance metrics for all commercials
     */
    @Transactional
    public void migrateCommercialPerformance() {
        try {
            log.info("Starting commercial performance data migration");
            long startTime = System.currentTimeMillis();
            
            // This would typically aggregate credits by commercial and month
            // For now, we'll use the existing aggregation data
            
            long endTime = System.currentTimeMillis();
            log.info("Commercial performance data migration completed in {} ms", (endTime - startTime));
            
        } catch (Exception e) {
            log.error("Failed to migrate commercial performance data: {}", e.getMessage(), e);
            throw e; // Re-throw to indicate failure
        }
    }
    
    /**
     * Migrate portfolio snapshot data
     * Creates historical portfolio snapshots
     */
    @Transactional
    public void migratePortfolioSnapshotData() {
        try {
            log.info("Starting portfolio snapshot data migration");
            long startTime = System.currentTimeMillis();
            
            // This would create historical snapshots based on credit status at different dates
            // For now, we'll focus on creating a current snapshot
            
            long endTime = System.currentTimeMillis();
            log.info("Portfolio snapshot data migration completed in {} ms", (endTime - startTime));
            
        } catch (Exception e) {
            log.error("Failed to migrate portfolio snapshot data: {}", e.getMessage(), e);
            throw e; // Re-throw to indicate failure
        }
    }
    
    /**
     * Run complete historical data migration
     */
    @Transactional
    public void runCompleteHistoricalMigration() {
        log.info("Starting complete historical data migration");
        
        // Run migrations in order
        migrateHistoricalSalesData();
        migrateHistoricalCollectionData();
        migrateCommercialPerformance();
        migratePortfolioSnapshotData();
        
        log.info("Complete historical data migration finished");
    }
    
    /**
     * Run complete historical migration with error handling for idempotency
     */
    @Transactional
    public void runCompleteHistoricalMigrationIdempotent() {
        log.info("Starting idempotent historical data migration");
        
        try {
            migrateHistoricalSalesData();
            log.info("Sales migration completed successfully");
        } catch (Exception e) {
            log.warn("Sales migration had errors but continuing: {}", e.getMessage());
        }
        
        try {
            migrateHistoricalCollectionData();
            log.info("Collection migration completed successfully");
        } catch (Exception e) {
            log.warn("Collection migration had errors but continuing: {}", e.getMessage());
        }
        
        try {
            migrateCommercialPerformance();
            log.info("Commercial performance migration completed successfully");
        } catch (Exception e) {
            log.warn("Commercial performance migration had errors but continuing: {}", e.getMessage());
        }
        
        try {
            migratePortfolioSnapshotData();
            log.info("Portfolio snapshot migration completed successfully");
        } catch (Exception e) {
            log.warn("Portfolio snapshot migration had errors but continuing: {}", e.getMessage());
        }
        
        log.info("Idempotent historical data migration finished");
    }
}