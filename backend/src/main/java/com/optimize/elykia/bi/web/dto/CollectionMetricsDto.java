package com.optimize.elykia.bi.web.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CollectionMetricsDto {
    private Double totalCollected;
    private Double collectionRate;
    private Double evolution;
    private Integer onTimePaymentsCount;
    private Integer latePaymentsCount;
}
