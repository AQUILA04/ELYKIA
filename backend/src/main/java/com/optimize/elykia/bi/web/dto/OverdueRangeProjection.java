package com.optimize.elykia.bi.web.dto;

/**
 * Projection interface for overdue range analysis
 * Used for optimized native queries in BI performance optimization
 */
public interface OverdueRangeProjection {
    String getRange();
    Integer getCreditsCount();
    Double getTotalAmount();
}