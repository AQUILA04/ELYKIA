package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerOtpVerifyResponse {
    private final boolean verified;
    /** Jeton de preuve à présenter à {@code /setup-pin}. */
    private final String otpProofToken;
}
