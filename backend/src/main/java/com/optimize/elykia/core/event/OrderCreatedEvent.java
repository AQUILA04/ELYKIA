package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class OrderCreatedEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final Long orderId;

    public OrderCreatedEvent(Object source, Double amount, String collector, Long orderId) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.orderId = orderId;
    }
}
