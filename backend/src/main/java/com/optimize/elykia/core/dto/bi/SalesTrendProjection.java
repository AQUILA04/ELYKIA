package com.optimize.elykia.core.dto.bi;

import java.time.LocalDate;

/**
 * Projection interface for sales trends aggregation
 * Used for optimized native queries in BI performance optimization
 */
public interface SalesTrendProjection {
    LocalDate getDate();
    Integer getSalesCount();
    Double getTotalAmount();
    Double getTotalProfit();
    Double getAvgAmount();
}