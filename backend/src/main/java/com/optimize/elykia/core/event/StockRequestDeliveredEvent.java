package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class StockRequestDeliveredEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final Double margin;
    private final String reference;

    public StockRequestDeliveredEvent(Object source, Double amount, String collector, Double margin, String reference) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.margin = margin;
        this.reference = reference;
    }
}
