package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TontineMemberEnrolledEvent extends ApplicationEvent {
    private final String collector;
    private final String clientName;

    public TontineMemberEnrolledEvent(Object source, String collector, String clientName) {
        super(source);
        this.collector = collector;
        this.clientName = clientName;
    }
}
