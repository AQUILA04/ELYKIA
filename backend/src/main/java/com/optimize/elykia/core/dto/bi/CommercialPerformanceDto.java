package com.optimize.elykia.core.dto.bi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommercialPerformanceDto {
    private String collector;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private Integer totalSalesCount;
    private Double totalSalesAmount;
    private Double totalProfit;
    private Double averageSaleAmount;
    private Double totalCollected;
    private Double collectionRate;
    private Integer onTimePaymentsCount;
    private Integer latePaymentsCount;
    private Integer activeClientsCount;
    private Integer newClientsCount;
    private Double clientRetentionRate;
    private Double portfolioAtRisk;
    private Integer criticalAccountsCount;
}