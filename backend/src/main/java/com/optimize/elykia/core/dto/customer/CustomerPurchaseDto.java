package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CustomerPurchaseDto {
    private String id;
    private String reference;
    private double totalAmount;
    private double paidAmount;
    private double remainingAmount;
    private double dailyPayment;
    private String startDate;
    private String endDate;
    private String status;
    private int articleCount;
    private List<CustomerPurchaseItemDto> items;
    private List<CustomerRecoveryDto> recoveries;
    private int installmentCount;
    private int paidInstallmentCount;
    private int lateInstallmentCount;
    private int initiatedInstallmentCount;
}
