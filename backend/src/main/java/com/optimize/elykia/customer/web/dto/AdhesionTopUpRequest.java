package com.optimize.elykia.customer.web.dto;

import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdhesionTopUpRequest {
    @Positive
    private double amount;
}
