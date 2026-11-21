package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.OrderSource;
import lombok.Data;

@Data
public class CreatePendingStockRequestDto {
    private Boolean forNextMonth = false;
    private OrderSource source;
}
