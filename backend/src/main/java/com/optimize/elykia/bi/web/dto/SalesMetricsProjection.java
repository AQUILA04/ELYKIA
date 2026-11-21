package com.optimize.elykia.bi.web.dto;

/**
 * Projection interface for sales metrics aggregation
 * Used for optimized native queries in BI performance optimization
 */
public interface SalesMetricsProjection {
    Integer getSalesCount();
    Double getTotalAmount();
    Double getTotalProfit();
    Double getAvgAmount();
}