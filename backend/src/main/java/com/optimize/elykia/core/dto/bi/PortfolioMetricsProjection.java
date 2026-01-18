package com.optimize.elykia.core.dto.bi;

/**
 * Projection interface for portfolio metrics aggregation
 * Used for optimized native queries in BI performance optimization
 */
public interface PortfolioMetricsProjection {
    Integer getActiveCount();
    Double getTotalOutstanding();
    Double getTotalOverdue();
    Double getPar7();
    Double getPar15();
    Double getPar30();
}