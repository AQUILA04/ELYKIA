package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.stock.StockRequest;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StockRequestCreateDto {
    private StockRequest request;
    private Boolean forNextMonth;
}
