package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class StockTontineReturnedEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;

    public StockTontineReturnedEvent(Object source, Double amount, String collector) {
        super(source);
        this.amount = amount;
        this.collector = collector;
    }
}
