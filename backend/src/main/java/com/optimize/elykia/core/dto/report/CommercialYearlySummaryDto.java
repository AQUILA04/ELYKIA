package com.optimize.elykia.core.dto.report;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CommercialYearlySummaryDto {
    int year;
    String commercialUsername;
    double totalCreditSalesAmount;
    int totalCreditSalesCount;
    double totalCreditDepositedAmount;
    double remainingAtClientsAmount;
}
