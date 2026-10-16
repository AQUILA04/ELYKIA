package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerAutomaticInitialPaymentRequest {

    @NotBlank
    private String network;

    @NotBlank
    private String phone;
}
