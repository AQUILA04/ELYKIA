package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.bi.CommercialPerformanceMonthly;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for CommercialPerformanceMonthly entity
 * Provides optimized queries for commercial performance data
 */
@Repository
public interface CommercialPerformanceMonthlyRepository extends JpaRepository<CommercialPerformanceMonthly, Long> {
    
    /**
     * Find performance records by year and month
     */
    List<CommercialPerformanceMonthly> findByYearAndMonth(Integer year, Integer month);
    
    /**
     * Find performance records by collector and date range
     */
    @Query("SELECT c FROM CommercialPerformanceMonthly c WHERE c.collector = :collector AND c.year = :year AND c.month BETWEEN :startMonth AND :endMonth ORDER BY c.year, c.month")
    List<CommercialPerformanceMonthly> findByCollectorAndYearAndMonthBetween(
        @Param("collector") String collector,
        @Param("year") Integer year,
        @Param("startMonth") Integer startMonth,
        @Param("endMonth") Integer endMonth
    );
    
    /**
     * Find existing performance record for upsert operations
     */
    Optional<CommercialPerformanceMonthly> findByCollectorAndYearAndMonth(
        String collector, Integer year, Integer month
    );
}