package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class RecoveryManagerCollectionEvent extends ApplicationEvent {
    private final String commercialUsername;
    private final Double amount;

    public RecoveryManagerCollectionEvent(Object source, String commercialUsername, Double amount) {
        super(source);
        this.commercialUsername = commercialUsername;
        this.amount = amount;
    }
}
