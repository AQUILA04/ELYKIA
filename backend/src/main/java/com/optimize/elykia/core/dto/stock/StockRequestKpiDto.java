package com.optimize.elykia.core.dto.stock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockRequestKpiDto {
    private long total;
    private long pending;
    private long validated;
    private long delivered;
}
