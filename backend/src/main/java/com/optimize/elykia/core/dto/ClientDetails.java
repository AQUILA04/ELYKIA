package com.optimize.elykia.core.dto;

import lombok.Data;

@Data
public class ClientDetails {
    private String name;
    private String phone;
    private String occupation;
    private String address;
    private String accountNumber;
    private String collector;
    private Integer totalInProgressCredit;
    private Double totalInProgressCreditAmount;
    private Double totalInProgressAmountDue;
    private Double totalInProgressAmountCollected;
    private Integer totalCreditClosed;
    private Integer totalCreditDelayed;
    private Double totalAmountRemaining;

}
