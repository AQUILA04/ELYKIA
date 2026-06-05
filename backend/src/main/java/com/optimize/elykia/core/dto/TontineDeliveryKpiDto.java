package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TontineDeliveryKpiDto {
    private Long totalCount;
    private Double totalAmount;
    private Double totalRemainingBalance;
    private Long pendingCount;
    private Long validatedCount;
    private Long deliveredCount;
}
