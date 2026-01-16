package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class CreditStartedEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final Double advance;

    public CreditStartedEvent(Object source, Double amount, String collector, Double advance) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.advance = advance;
    }
}
