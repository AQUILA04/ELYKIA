package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerRecoveryDto {
    private String id;
    private int installmentNumber;
    private double amount;
    private String paymentDate;
    private String status;
    private String mobileMoneyPhone;
    private Double mobileMoneyAmount;
    private String mobileMoneyReference;
}
