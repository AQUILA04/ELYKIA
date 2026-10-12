package com.optimize.elykia.core.dto.debt;

import lombok.Builder;
import lombok.Value;

import java.util.Map;

@Value
@Builder
public class DebtSummaryDto {
    double openDebtTotal;
    double openSurplusTotal;
    double netPosition;
    Map<String, Double> remainingByType;
    long pendingMerchandiseMonths;
    long pendingCashGaps;
}
