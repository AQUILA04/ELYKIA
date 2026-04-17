package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class StockTontineRequestDeliveredEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;

    private final String reference;

    public StockTontineRequestDeliveredEvent(Object source, Double amount, String collector, String reference) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.reference = reference;
    }
}
