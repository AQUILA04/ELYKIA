package com.optimize.elykia.client.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ClientPhoneUpdatedEvent extends ApplicationEvent {
    private final Long clientId;
    private final String oldPhone;
    private final String newPhone;

    public ClientPhoneUpdatedEvent(Object source, Long clientId, String oldPhone, String newPhone) {
        super(source);
        this.clientId = clientId;
        this.oldPhone = oldPhone;
        this.newPhone = newPhone;
    }
}
