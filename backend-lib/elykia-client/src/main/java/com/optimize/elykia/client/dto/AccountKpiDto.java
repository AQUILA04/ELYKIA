package com.optimize.elykia.client.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountKpiDto {
    private long activeCount;
    private long inactiveCount;
    private double activeTotalBalance;
}
