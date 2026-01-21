package com.optimize.elykia.client.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ClientCreatedEvent extends ApplicationEvent {
    private final String collector;

    public ClientCreatedEvent(Object source, String collector) {
        super(source);
        this.collector = collector;
    }
}
