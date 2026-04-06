package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.bi.CollectionAnalyticsDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Repository for CollectionAnalyticsDaily entity
 * Provides optimized queries for collection aggregation data
 */
@Repository
public interface CollectionAggregationRepository extends JpaRepository<CollectionAnalyticsDaily, Long> {
    
    /**
     * Find collection analytics by date range
     */
    @Query("SELECT c FROM CollectionAnalyticsDaily c WHERE c.collectionDate BETWEEN :startDate AND :endDate ORDER BY c.collectionDate")
    java.util.List<CollectionAnalyticsDaily> findByDateRange(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find existing aggregation record for upsert operations
     */
    Optional<CollectionAnalyticsDaily> findByCollectionDateAndCollector(
        LocalDate collectionDate, String collector
    );
}