package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class CreditCollectionCancelledEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final String creditReference;
    private final String recoveryReference;
    private final Double reliquatGeneratedAmount;
    private final Double reliquatUsedAmount;

    public CreditCollectionCancelledEvent(Object source, Double amount, String collector, String creditReference,
            String recoveryReference, Double reliquatGeneratedAmount, Double reliquatUsedAmount) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.creditReference = creditReference;
        this.recoveryReference = recoveryReference;
        this.reliquatGeneratedAmount = reliquatGeneratedAmount;
        this.reliquatUsedAmount = reliquatUsedAmount;
    }
}
