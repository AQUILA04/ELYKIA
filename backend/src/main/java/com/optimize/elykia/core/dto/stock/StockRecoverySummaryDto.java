package com.optimize.elykia.core.dto.stock;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class StockRecoverySummaryDto {
    double totalDueAmount;
    double totalRecoveredAmount;
    double totalRemainingAmount;
    double recoveryRatePercent;
    double remainingFromPhysicalStock;
    double recoveredFromSales;
    double remainingFromCredits;
}
