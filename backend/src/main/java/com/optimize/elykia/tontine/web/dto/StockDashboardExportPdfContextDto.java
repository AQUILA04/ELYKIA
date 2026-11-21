package com.optimize.elykia.tontine.web.dto;

import com.optimize.elykia.sale.web.dto.CommercialStockDashboardExportDTO;
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

    // Nouveau design : période, flux marchandise et argent (mêmes chiffres que l'écran).
    private String periodLabel;
    /** Période lisible : « 01/10/2026 → 31/10/2026 ». */
    private String periodRange;
    private Long totalDebtQuantity;
    private Double totalDebtValue;
    private Double dueValue;
    private Double recoveredValue;
    private Double leftToRecover;
    private Double recoveryRate;
    private Double soldRate;
    private Double debtSettled;
    private Double debtRemaining;
    private Integer itemsWithRemaining;
}
