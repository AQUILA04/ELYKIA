package com.optimize.common.securities.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ParameterUpdatedEvent extends ApplicationEvent {

    private final String key;
    private final String oldValue;
    private final String newValue;

    public ParameterUpdatedEvent(Object source, String key, String oldValue, String newValue) {
        super(source);
        this.key = key;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}
