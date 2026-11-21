package com.optimize.elykia.carnet.web.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RmPackTontineCollectorDto {
    private String commercialUsername;
    private boolean currentCollector;
    private Double totalAmount;
    private List<RmPackTontineMonthDto> months;
}
