package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SessionComparisonDto {
    
    private List<SessionSummaryDto> sessions;
    private ComparisonMetricsDto comparisonMetrics;
    private State state =State.ENABLED;

}
