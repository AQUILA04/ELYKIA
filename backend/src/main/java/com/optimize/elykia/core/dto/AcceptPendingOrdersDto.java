package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.OrderSource;
import lombok.Data;

@Data
public class AcceptPendingOrdersDto {
    private String commercial;
    private String search;
    private OrderSource source;
}
