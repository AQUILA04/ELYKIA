package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerLoginRequest {
    @NotBlank
    private String phone;

    @NotBlank
    @Pattern(regexp = "\\d{4,6}")
    private String pin;
}
