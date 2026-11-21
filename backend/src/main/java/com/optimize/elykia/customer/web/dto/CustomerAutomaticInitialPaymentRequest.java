package com.optimize.elykia.customer.web.dto;

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
