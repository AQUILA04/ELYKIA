package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockDashboardExportPdfContextDto {
    private String title;
    private String startDate;
    private String endDate;
    private String collector;
    private String generationDate;
    private List<CommercialStockDashboardExportDTO> items;
    private Long totalTaken;
    private Long totalSold;
    private Long totalReturned;
    private Long totalRemaining;
    private Double totalSoldValue;
    private Double totalRemainingValue;
}
