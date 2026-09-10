package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerOtpVerifyRequest {
    @NotBlank
    private String phone;

    @NotBlank
    private String code;
}
