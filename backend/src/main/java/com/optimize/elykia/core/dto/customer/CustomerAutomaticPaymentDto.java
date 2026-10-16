package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerAutomaticPaymentDto {
    private Long submissionId;
    private String purpose;
    private String status;
    private String network;
    private Long installmentAmount;
    private Long withdrawalFee;
    private Double gatewayFeeRate;
    private Long gatewayFee;
    private Long amountCharged;
    private String message;
}
