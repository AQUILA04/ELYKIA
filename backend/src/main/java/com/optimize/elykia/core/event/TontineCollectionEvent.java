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
    /** Date de saisie (date_reg / jour J). */
    private final LocalDate captureDate;
    private final Long collectionId;
    private final String collectionReference;

    public TontineCollectionEvent(Object source, Double amount, String collector, String clientName,
            LocalDate operationDate, LocalDate captureDate) {
        this(source, amount, collector, clientName, operationDate, captureDate, null, null);
    }

    public TontineCollectionEvent(Object source, Double amount, String collector, String clientName,
            LocalDate operationDate, LocalDate captureDate, Long collectionId, String collectionReference) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.clientName = clientName;
        this.operationDate = operationDate != null ? operationDate : LocalDate.now();
        this.captureDate = captureDate != null ? captureDate : this.operationDate;
        this.collectionId = collectionId;
        this.collectionReference = collectionReference;
    }

    public boolean isCatchup() {
        return !operationDate.equals(captureDate);
    }
}
