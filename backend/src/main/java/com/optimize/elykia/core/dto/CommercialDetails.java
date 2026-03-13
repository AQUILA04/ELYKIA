package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
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
    private State state =State.ENABLED;

}
