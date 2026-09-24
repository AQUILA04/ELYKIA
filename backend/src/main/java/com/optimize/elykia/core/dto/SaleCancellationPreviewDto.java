package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleCancellationPreviewDto {

    private String commercialUsername;
    private LocalDate startDate;
    private LocalDate endDate;

    private int totalSalesFound;
    private int eligibleCount;
    private double eligibleAmount;

    private int excludedCount;
    private double excludedAmount;

    private List<EligibleSaleItemDto> eligibleSales;
    private List<ExcludedSaleItemDto> excludedSales;
    private List<StockImpactItemDto> stockImpacts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EligibleSaleItemDto {
        private Long creditId;
        private String reference;
        private String clientName;
        private LocalDate saleDate;
        private String creditStatus;
        private double totalAmount;
        private double advance;
        private String articlesSummary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExcludedSaleItemDto {
        private Long creditId;
        private String reference;
        private String clientName;
        private LocalDate saleDate;
        private double totalAmount;
        private double paidAmount;
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockImpactItemDto {
        private Long articleId;
        private String articleCode;
        private String articleName;
        private int quantityToReturn;
    }
}
