package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.SalesAnalyticsDaily;
import com.optimize.elykia.core.dto.bi.SalesTrendProjection;
import com.optimize.elykia.core.dto.bi.CommercialSalesProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Repository for SalesAnalyticsDaily entity
 * Provides optimized queries for sales aggregation data
 */
@Repository
public interface SalesAggregationRepository extends JpaRepository<SalesAnalyticsDaily, Long> {
    
    /**
     * Get sales trends from aggregation table for a date range
     * Groups by date and calculates daily metrics
     */
    @Query(value = """
        SELECT 
            sale_date as date,
            SUM(sales_count) as salesCount,
            SUM(total_sales) as totalAmount,
            SUM(total_profit) as totalProfit,
            AVG(avg_sale_amount) as avgAmount
        FROM sales_analytics_daily
        WHERE sale_date BETWEEN :startDate AND :endDate
        GROUP BY sale_date
        ORDER BY sale_date
        """, nativeQuery = true)
    java.util.List<SalesTrendProjection> findTrendsByDateRange(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Get commercial sales performance from aggregation table
     * Groups by collector and calculates performance metrics
     */
    @Query(value = """
        SELECT 
            collector,
            SUM(sales_count) as salesCount,
            SUM(total_sales) as totalAmount,
            SUM(total_profit) as totalProfit,
            AVG(avg_sale_amount) as avgAmount,
            SUM(total_collected) as totalCollected
        FROM sales_analytics_daily
        WHERE sale_date BETWEEN :startDate AND :endDate
        GROUP BY collector
        ORDER BY totalAmount DESC
        """, nativeQuery = true)
    java.util.List<CommercialSalesProjection> findByCommercial(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find existing aggregation record for upsert operations
     */
    Optional<SalesAnalyticsDaily> findBySaleDateAndCollectorAndClientType(
        LocalDate saleDate, String collector, String clientType
    );
}