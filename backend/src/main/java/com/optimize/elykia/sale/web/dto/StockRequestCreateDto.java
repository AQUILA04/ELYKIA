package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.StockRequest;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StockRequestCreateDto {
    private StockRequest request;
    private Boolean forNextMonth;
}
