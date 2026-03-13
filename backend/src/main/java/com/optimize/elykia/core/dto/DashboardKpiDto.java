package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Data;

@Data
public class DashboardKpiDto {
    private long pendingOrdersCount;
    private double potentialValue;
    private double acceptanceRate;
    private double denialRate;
    private double acceptedPipelineValue;
    private double averageOrderValue;
    private double soldValueLast30Days;
    private double potentialProfit;
    private State state =State.ENABLED;

}
