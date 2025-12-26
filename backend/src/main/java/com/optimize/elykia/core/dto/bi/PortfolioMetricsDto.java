package com.optimize.elykia.core.dto.bi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioMetricsDto {
    private Integer activeCreditsCount;
    private Double totalOutstanding;
    private Double totalOverdue;
    private Double par7;
    private Double par15;
    private Double par30;
}
