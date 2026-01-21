package com.optimize.elykia.client.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class AccountCreatedEvent extends ApplicationEvent {
    private final Double initialBalance;
    private final String collector;

    public AccountCreatedEvent(Object source, Double initialBalance, String collector) {
        super(source);
        this.initialBalance = initialBalance;
        this.collector = collector;
    }
}
