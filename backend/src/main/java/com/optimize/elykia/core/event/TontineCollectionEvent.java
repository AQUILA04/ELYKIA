package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TontineCollectionEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final String clientName;

    public TontineCollectionEvent(Object source, Double amount, String collector, String clientName) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.clientName = clientName;
    }
}
