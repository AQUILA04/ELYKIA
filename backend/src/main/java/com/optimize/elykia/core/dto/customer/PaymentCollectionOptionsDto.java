package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PaymentCollectionOptionsDto {
    private String mode;
    private List<NetworkQuoteDto> networks;

    @Getter
    @Builder
    public static class NetworkQuoteDto {
        private String network;
        private String label;
        private Long installmentAmount;
        private Long withdrawalFee;
        private Double gatewayFeeRate;
        private Long gatewayFee;
        private Long amountCharged;
        private String unavailableReason;
    }
}
