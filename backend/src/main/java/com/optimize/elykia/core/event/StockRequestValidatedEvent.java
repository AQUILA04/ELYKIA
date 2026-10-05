package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class StockRequestValidatedEvent extends ApplicationEvent {
    private final Long stockRequestId;

    public StockRequestValidatedEvent(Object source, Long stockRequestId) {
        super(source);
        this.stockRequestId = stockRequestId;
    }
}
