package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerTontineJoinResponse {
    private String memberId;
    private Integer sessionYear;
    private Double dailyStake;
    /** "INITIE" ou "EN_COURS" si un premier paiement a été lancé, sinon null. */
    private String initialPaymentStatus;
    private Long automaticPaymentId;
}
