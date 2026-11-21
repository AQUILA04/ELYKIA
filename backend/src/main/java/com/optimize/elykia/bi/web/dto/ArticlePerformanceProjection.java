package com.optimize.elykia.bi.web.dto;

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