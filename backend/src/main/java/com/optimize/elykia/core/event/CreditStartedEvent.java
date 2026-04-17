package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class CreditStartedEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final Double advance;
    private final Double margin;
    private final String clientName;
    private final String reference;

    public CreditStartedEvent(Object source, Double amount, String collector, Double advance, Double margin,
            String clientName, String reference) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.advance = advance;
        this.margin = margin;
        this.clientName = clientName;
        this.reference = reference;
    }
}
