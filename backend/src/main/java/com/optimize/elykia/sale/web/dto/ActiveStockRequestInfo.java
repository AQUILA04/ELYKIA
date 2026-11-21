package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.StockRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActiveStockRequestInfo {
    private Long id;
    private String reference;
    private StockRequestStatus status;
}
