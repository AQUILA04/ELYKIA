package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TontineMemberEnrolledEvent extends ApplicationEvent {
    private final String collector;

    public TontineMemberEnrolledEvent(Object source, String collector) {
        super(source);
        this.collector = collector;
    }
}
