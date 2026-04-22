package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class StockTontineReturnedEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final Long returnId;

    public StockTontineReturnedEvent(Object source, Double amount, String collector, Long returnId) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.returnId = returnId;
    }
}
