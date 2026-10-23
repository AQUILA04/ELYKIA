package com.optimize.elykia.core.event;

import com.optimize.elykia.core.enumaration.OperationType;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class AdhesionCashEvent extends ApplicationEvent {
    private final String collector;
    private final double amount;
    private final OperationType operationType;
    private final String label;
    private final String description;

    public AdhesionCashEvent(
            Object source,
            String collector,
            double amount,
            OperationType operationType,
            String label,
            String description) {
        super(source);
        this.collector = collector;
        this.amount = amount;
        this.operationType = operationType;
        this.label = label;
        this.description = description;
    }
}
