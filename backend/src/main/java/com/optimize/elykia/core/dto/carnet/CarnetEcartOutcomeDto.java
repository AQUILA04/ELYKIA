package com.optimize.elykia.core.dto.carnet;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CarnetEcartOutcomeDto {
    String key;
    String message;
    Double amount;
}
