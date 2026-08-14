package com.optimize.elykia.core.dto.report;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CommercialTontineYearlySummaryDto {
    int year;
    String commercialUsername;
    double totalTontineCollectionsAmount;
    long totalTontineCollectionsCount;
    double totalTontineDepositedAmount;
    double remainingAtCommercialAmount;
}
