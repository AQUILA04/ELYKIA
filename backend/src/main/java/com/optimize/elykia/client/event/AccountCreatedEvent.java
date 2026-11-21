package com.optimize.elykia.client.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class AccountCreatedEvent extends ApplicationEvent {
    private final Double initialBalance;
    private final String collector;
    private final String accountNumber;

    public AccountCreatedEvent(Object source, Double initialBalance, String collector, String accountNumber) {
        super(source);
        this.initialBalance = initialBalance;
        this.collector = collector;
        this.accountNumber = accountNumber;
    }

    public String getAccountNumber() {
        return accountNumber;
    }
}
