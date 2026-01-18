package com.optimize.elykia.core.service;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.entity.*;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Service for handling real-time aggregation updates
 * Updates aggregation tables when credits or payments are created/modified
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BiAggregationService {
    
    private final SalesAggregationRepository salesAggregationRepository;
    private final CollectionAggregationRepository collectionAggregationRepository;
    private CommercialPerformanceMonthlyRepository commercialPerformanceMonthlyRepository; // Added for commercial performance aggregation - injected separately
    
    /**
     * Setter for commercial performance repository (to allow optional injection)
     */
    public void setCommercialPerformanceMonthlyRepository(CommercialPerformanceMonthlyRepository commercialPerformanceMonthlyRepository) {
        this.commercialPerformanceMonthlyRepository = commercialPerformanceMonthlyRepository;
    }
    
    /**
     * Update sales aggregation when a credit is created or modified
     * Called from CreditService after credit operations
     */
    @Transactional
    public void updateSalesAggregation(Credit credit) {
        long startTime = System.currentTimeMillis();
        try {
            // Only process CLIENT credits of type CREDIT
            if (!OperationType.CREDIT.equals(credit.getType()) || 
                !ClientType.CLIENT.equals(credit.getClientType())) {
                log.debug("Skipping sales aggregation for non-CREDIT CLIENT credit ID: {}", credit.getId());
                return;
            }
            
            LocalDate saleDate = credit.getCreatedDate().toLocalDate();
            String collector = credit.getCollector();
            String clientType = credit.getClientType().name();
            
            // Find existing aggregation record or create new one
            SalesAnalyticsDaily aggregation = salesAggregationRepository
                .findBySaleDateAndCollectorAndClientType(saleDate, collector, clientType)
                .orElse(new SalesAnalyticsDaily());
            
            // Set/Update the aggregation data
            aggregation.setSaleDate(saleDate);
            aggregation.setCollector(collector);
            aggregation.setClientType(clientType);
            
            // Update counts and amounts
            aggregation.setSalesCount(aggregation.getSalesCount() + 1);
            aggregation.setTotalSales(aggregation.getTotalSales() + credit.getTotalAmount());
            aggregation.setTotalCost(aggregation.getTotalCost() + credit.getTotalPurchase());
            aggregation.setTotalProfit(aggregation.getTotalProfit() + 
                (credit.getTotalAmount() - credit.getTotalPurchase()));
            aggregation.setAvgSaleAmount(aggregation.getTotalSales() / aggregation.getSalesCount());
            
            // Update collected amount if applicable
            if (credit.getTotalAmountPaid() != null) {
                aggregation.setTotalCollected(aggregation.getTotalCollected() + credit.getTotalAmountPaid());
                if (credit.getStatus().name().equals("SETTLED")) {
                    aggregation.setSettledCount(aggregation.getSettledCount() + 1);
                }
            }
            
            salesAggregationRepository.save(aggregation);
            long endTime = System.currentTimeMillis();
            log.info("Updated sales aggregation for date={}, collector={}, count={}, duration={}ms", 
                saleDate, collector, aggregation.getSalesCount(), (endTime - startTime));
                
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            log.error("Failed to update sales aggregation for credit ID {}: duration={}ms, error={}", 
                credit.getId(), (endTime - startTime), e.getMessage(), e);
            // Don't throw exception to avoid failing the main credit operation
        }
    }
    
    /**
     * Update collection aggregation when a payment is recorded
     * Called from CreditTimelineService after payment recording
     */
    @Transactional
    public void updateCollectionAggregation(CreditTimeline payment) {
        long startTime = System.currentTimeMillis();
        try {
            // Only process CREDIT type payments - check if the associated credit is of type CREDIT
            if (payment.getCredit() == null || !OperationType.CREDIT.equals(payment.getCredit().getType())) {
                log.debug("Skipping collection aggregation for non-CREDIT payment ID: {}", payment.getId());
                return;
            }
            
            // Get date from the creation date of the payment timeline entry
            LocalDate collectionDate = payment.getCreationDate(); // Using the getCreationDate method from CreditTimeline entity
            String collector = payment.getCollector();
            
            // Find existing aggregation record or create new one
            CollectionAnalyticsDaily aggregation = collectionAggregationRepository
                .findByCollectionDateAndCollector(collectionDate, collector)
                .orElse(new CollectionAnalyticsDaily());
            
            // Set/Update the aggregation data
            aggregation.setCollectionDate(collectionDate);
            aggregation.setCollector(collector);
            
            // Update counts and amounts
            aggregation.setPaymentCount(aggregation.getPaymentCount() + 1);
            aggregation.setTotalCollected(aggregation.getTotalCollected() + payment.getAmount());
            aggregation.setAvgPayment(aggregation.getTotalCollected() / aggregation.getPaymentCount());
            
            // Determine if payment was on-time or late (simplified logic)
            // In a real implementation, you'd check against expected payment dates
            aggregation.setOnTimeCount(aggregation.getOnTimeCount() + 1); // Simplified
            
            collectionAggregationRepository.save(aggregation);
            long endTime = System.currentTimeMillis();
            log.info("Updated collection aggregation for date={}, collector={}, amount={}, duration={}ms", 
                collectionDate, collector, payment.getAmount(), (endTime - startTime));
                
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            log.error("Failed to update collection aggregation for payment ID {}: duration={}ms, error={}", 
                payment.getId(), (endTime - startTime), e.getMessage(), e);
            // Don't throw exception to avoid failing the main payment operation
        }
    }
    
    /**
     * Bulk update for multiple credits (used during migration)
     */
    @Transactional
    public void updateSalesAggregations(Iterable<Credit> credits) {
        long startTime = System.currentTimeMillis();
        int count = 0;
        for (Credit credit : credits) {
            updateSalesAggregation(credit);
            count++;
        }
        long endTime = System.currentTimeMillis();
        log.info("Bulk updated sales aggregations for {} credits, duration={}ms", count, (endTime - startTime));
    }
    
    /**
     * Bulk update for multiple payments (used during migration)
     */
    @Transactional
    public void updateCollectionAggregations(Iterable<CreditTimeline> payments) {
        long startTime = System.currentTimeMillis();
        int count = 0;
        for (CreditTimeline payment : payments) {
            updateCollectionAggregation(payment);
            count++;
        }
        long endTime = System.currentTimeMillis();
        log.info("Bulk updated collection aggregations for {} payments, duration={}ms", count, (endTime - startTime));
    }
}