package com.optimize.elykia.client.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ClientCreatedEvent extends ApplicationEvent {
    private final String collector;
    private final String clientFullName;

    public ClientCreatedEvent(Object source, String collector, String clientFullName) {
        super(source);
        this.collector = collector;
        this.clientFullName = clientFullName;
    }

    public String getClientFullName() {
        return clientFullName;
    }
}
