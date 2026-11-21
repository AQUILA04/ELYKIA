package com.optimize.elykia.bi.web.dto;

/**
 * Projection interface for commercial sales aggregation
 * Used for optimized native queries in BI performance optimization
 */
public interface CommercialSalesProjection {
    String getCollector();
    Integer getSalesCount();
    Double getTotalAmount();
    Double getTotalProfit();
    Double getAvgAmount();
    Double getTotalCollected();
}