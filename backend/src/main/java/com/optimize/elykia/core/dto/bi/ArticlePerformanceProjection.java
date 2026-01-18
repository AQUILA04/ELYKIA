package com.optimize.elykia.core.dto.bi;

/**
 * Projection interface for article performance aggregation
 * Used for optimized native queries in BI performance optimization
 */
public interface ArticlePerformanceProjection {
    Long getArticleId();
    String getArticleName();
    String getCategory();
    Integer getQuantitySold();
    Double getTotalRevenue();
    Double getTotalProfit();
    Double getTurnoverRate();
    Integer getStockQuantity();
}