package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDate;

@Getter
public class CreditCollectionCancelledEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final String creditReference;
    private final String recoveryReference;
    private final Double reliquatGeneratedAmount;
    private final Double reliquatUsedAmount;
    /** Date du recouvrement d'origine — utilisée pour décrémenter le bon DailyCommercialReport. */
    private final LocalDate operationDate;

    public CreditCollectionCancelledEvent(Object source, Double amount, String collector, String creditReference,
            String recoveryReference, Double reliquatGeneratedAmount, Double reliquatUsedAmount,
            LocalDate operationDate) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.creditReference = creditReference;
        this.recoveryReference = recoveryReference;
        this.reliquatGeneratedAmount = reliquatGeneratedAmount;
        this.reliquatUsedAmount = reliquatUsedAmount;
        this.operationDate = operationDate != null ? operationDate : LocalDate.now();
    }
}
