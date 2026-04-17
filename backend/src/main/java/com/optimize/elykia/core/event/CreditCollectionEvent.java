package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class CreditCollectionEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final String creditReference;
    private final String recoveryReference;

    public CreditCollectionEvent(Object source, Double amount, String collector, String creditReference, String recoveryReference) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.creditReference = creditReference;
        this.recoveryReference = recoveryReference;
    }
}
