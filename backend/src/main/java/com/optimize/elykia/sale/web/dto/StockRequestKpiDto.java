package com.optimize.elykia.sale.web.dto;

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
