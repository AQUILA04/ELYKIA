package com.optimize.elykia.reporting.web.dto;

import lombok.Data;

@Data
public class CommercialDetails {
    private String name;
    private String zone;
    private String phone;
    private Integer totalClient;
    private Integer totalInProgressCredit;
    private Double totalInProgressCreditAmount;
    private Double totalInProgressRemainingAmount;
    private Double totalAmountDue;
    private Double totalAmountCollected;
    private Integer totalCreditDelayed;
    private Integer totalCreditClosed;
    private Double totalAdvance;
    private Double totalNotDistributed;
}
