package com.optimize.elykia.core.dto.bi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockMetricsDto {
    private Double totalValue;
    private Integer itemsCount;
    private Integer lowStockCount;
    private Integer outOfStockCount;
    private Double averageTurnoverRate;
}
