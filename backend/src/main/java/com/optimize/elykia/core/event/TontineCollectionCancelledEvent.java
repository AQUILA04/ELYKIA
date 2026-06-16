package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TontineCollectionCancelledEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final String clientName;
    private final String reference;

    public TontineCollectionCancelledEvent(Object source, Double amount, String collector, String clientName, String reference) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.clientName = clientName;
        this.reference = reference;
    }
}
