package com.optimize.elykia.tontine.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TontineStockRequestValidatedEvent extends ApplicationEvent {
    private final Long stockTontineRequestId;

    public TontineStockRequestValidatedEvent(Object source, Long stockTontineRequestId) {
        super(source);
        this.stockTontineRequestId = stockTontineRequestId;
    }
}
