package com.optimize.elykia.core.dto.bi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockAlertDto {
    private Long articleId;
    private String articleName;
    private String category;
    private Integer currentStock;
    private Integer reorderPoint;
    private Integer recommendedQuantity;
    private String urgency; // "CRITICAL", "HIGH", "MEDIUM"
    private Double averageMonthlySales;
    private Integer daysOfStockRemaining;
}
