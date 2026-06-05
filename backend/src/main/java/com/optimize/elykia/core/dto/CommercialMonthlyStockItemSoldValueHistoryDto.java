package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommercialMonthlyStockItemSoldValueHistoryDto {
    private Long id;
    private Long stockItemId;
    private Long creditId;
    private String creditReference;
    private CommercialStockMovementType movementType;
    private Integer quantity;
    private Double saleUnitPrice;
    private Double weightedAverageUnitPrice;
    private Double previousTotalSoldValue;
    private Double newTotalSoldValue;
    private Double deltaValue;
    private LocalDateTime createdDate;
    private String createdBy;
}
