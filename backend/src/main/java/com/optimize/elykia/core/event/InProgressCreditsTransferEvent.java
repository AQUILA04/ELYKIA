package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.List;

@Getter
public class InProgressCreditsTransferEvent extends ApplicationEvent {

    private final List<Long> clientIds;
    private final String newCollector;
    private final String performedBy;

    public InProgressCreditsTransferEvent(
            Object source, List<Long> clientIds, String newCollector, String performedBy) {
        super(source);
        this.clientIds = clientIds;
        this.newCollector = newCollector;
        this.performedBy = performedBy;
    }
}
