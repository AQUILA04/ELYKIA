package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerSetupPinRequest {
    @NotBlank
    private String phone;

    @NotBlank
    @Pattern(regexp = "\\d{4,6}")
    private String pin;

    /**
     * Preuve OTP : {@code POST /auth/verify-otp} pour l'activation,
     * {@code POST /auth/forgot-pin/verify-otp} pour la réinitialisation.
     */
    @NotBlank
    private String otpProofToken;
}
