package com.optimize.elykia.core.dto.bi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticlePerformanceDto {
    private Long articleId;
    private String articleName;
    private String category;
    private Integer quantitySold;
    private Double totalRevenue;
    private Double totalProfit;
    private Double profitMargin;
    private Double turnoverRate;
    private Integer stockQuantity;
    private Double contributionToRevenue; // % du CA total
}
