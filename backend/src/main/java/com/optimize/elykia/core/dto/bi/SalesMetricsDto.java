package com.optimize.elykia.core.dto.bi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalesMetricsDto {
    private Double totalAmount;
    private Double totalProfit;
    private Double profitMargin;
    private Integer count;
    private Double evolution;
    private Double averageSaleAmount;
}
