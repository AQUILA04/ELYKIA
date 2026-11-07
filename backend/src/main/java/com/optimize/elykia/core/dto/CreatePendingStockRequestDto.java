package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.OrderSource;
import lombok.Data;

@Data
public class CreatePendingStockRequestDto {
    private Boolean forNextMonth = false;
    private OrderSource source;
}
