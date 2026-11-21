package com.optimize.elykia.client.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ClientCreatedEvent extends ApplicationEvent {
    private final String collector;
    private final String clientFullName;
    private final Long clientId;
    private final String phone;

    public ClientCreatedEvent(Object source, String collector, String clientFullName, Long clientId, String phone) {
        super(source);
        this.collector = collector;
        this.clientFullName = clientFullName;
        this.clientId = clientId;
        this.phone = phone;
    }

    public String getClientFullName() {
        return clientFullName;
    }
}
