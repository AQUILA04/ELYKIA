package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDate;

@Getter
public class TontineCollectionEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final String clientName;
    /** Date métier (collectionDate) — compteurs d'activité tontine. */
    private final LocalDate operationDate;
    /** Date de saisie (date_reg / jour J) — cash à verser. */
    private final LocalDate captureDate;

    public TontineCollectionEvent(Object source, Double amount, String collector, String clientName,
            LocalDate operationDate, LocalDate captureDate) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.clientName = clientName;
        this.operationDate = operationDate != null ? operationDate : LocalDate.now();
        this.captureDate = captureDate != null ? captureDate : this.operationDate;
    }
}
