package com.optimize.elykia.core.dto.stock;

import lombok.Builder;
import lombok.Value;

import java.util.ArrayList;
import java.util.List;

@Value
@Builder
public class FifoConsumptionResult {
    double totalCost;
    double averageUnitCost;
    int quantityConsumed;
    @Builder.Default
    List<FifoLotSlice> slices = new ArrayList<>();
}
