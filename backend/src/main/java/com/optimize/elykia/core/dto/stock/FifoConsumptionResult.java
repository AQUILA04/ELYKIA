package com.optimize.elykia.core.dto.stock;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FifoConsumptionResult {
    double totalCost;
    double averageUnitCost;
    int quantityConsumed;
}
