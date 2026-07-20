package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrajectorySummaryDto {
    private int totalIn;
    private int totalOut;
    private int netDelta;
    private int movementCount;
    private int intermediateInventoryCount;
}
