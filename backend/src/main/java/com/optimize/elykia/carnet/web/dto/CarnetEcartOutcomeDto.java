package com.optimize.elykia.carnet.web.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CarnetEcartOutcomeDto {
    String key;
    String message;
    Double amount;
}
