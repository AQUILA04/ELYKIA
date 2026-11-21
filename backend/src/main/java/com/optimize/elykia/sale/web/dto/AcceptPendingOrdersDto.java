package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.OrderSource;
import lombok.Data;

@Data
public class AcceptPendingOrdersDto {
    private String commercial;
    private String search;
    private OrderSource source;
}
