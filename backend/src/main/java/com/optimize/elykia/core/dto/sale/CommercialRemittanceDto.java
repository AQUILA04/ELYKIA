package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class CommercialRemittanceDto {
    private String commercialUsername;
    private Integer operationsCount;
    private Double totalToRemit;
}
