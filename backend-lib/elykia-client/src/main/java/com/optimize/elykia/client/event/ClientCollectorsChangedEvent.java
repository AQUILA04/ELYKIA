package com.optimize.elykia.client.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.List;

@Getter
public class ClientCollectorsChangedEvent extends ApplicationEvent {

    private final List<ClientCollectorChangeRecord> changes;
    private final String performedBy;

    public ClientCollectorsChangedEvent(
            Object source, List<ClientCollectorChangeRecord> changes, String performedBy) {
        super(source);
        this.changes = changes;
        this.performedBy = performedBy;
    }
}
