package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticlePriceHistoryDto {
    private Long id;
    private double previousPurchasePrice;
    private double previousSellingPrice;
    private double previousCreditSalePrice;
    private double newPurchasePrice;
    private double newSellingPrice;
    private double newCreditSalePrice;
    private LocalDateTime createdDate;
    private String createdBy;
}
