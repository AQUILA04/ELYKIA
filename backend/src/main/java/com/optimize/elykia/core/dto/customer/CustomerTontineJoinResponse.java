package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerTontineJoinResponse {
    private String memberId;
    private Integer sessionYear;
    private Double dailyStake;
    /** "INITIE" si un premier paiement a été déclaré, sinon null. */
    private String initialPaymentStatus;
}
