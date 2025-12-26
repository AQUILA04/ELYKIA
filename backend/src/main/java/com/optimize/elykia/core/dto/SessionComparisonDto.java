package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SessionComparisonDto {
    
    private List<SessionSummaryDto> sessions;
    private ComparisonMetricsDto comparisonMetrics;
}
