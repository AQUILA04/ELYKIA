package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerAutomaticPaymentRequest {

    @NotBlank
    private String purpose;

    private String distributionId;

    private Long memberId;

    private Integer installmentNumber;

    @NotNull
    @Positive
    private Double amount;

    @NotBlank
    private String network;

    @NotBlank
    private String phone;
}
