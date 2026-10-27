package com.optimize.elykia.core.dto.customer;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerTontineJoinRequest {

    /** Session à rejoindre. Absente : la session annuelle de l'année. */
    private Long sessionId;

    @NotNull
    @DecimalMin(value = "100.0", message = "La mise journalière minimale est de 100 FCFA.")
    private Double dailyStake;

    @Valid
    private CustomerTontineInitialPaymentRequest initialPayment;

    @Valid
    private CustomerAutomaticInitialPaymentRequest automaticInitialPayment;
}
