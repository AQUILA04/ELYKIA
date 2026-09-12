package com.optimize.elykia.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDate;

@Getter
public class TontineCollectionCancelledEvent extends ApplicationEvent {
    private final Double amount;
    private final String collector;
    private final String clientName;
    private final String reference;
    private final Long collectionId;
    /** Date métier (collectionDate) — compteurs d'activité tontine. */
    private final LocalDate operationDate;
    /** Date de saisie (date_reg). */
    private final LocalDate captureDate;

    public TontineCollectionCancelledEvent(Object source, Double amount, String collector, String clientName,
            String reference, LocalDate operationDate, LocalDate captureDate) {
        this(source, amount, collector, clientName, reference, null, operationDate, captureDate);
    }

    public TontineCollectionCancelledEvent(Object source, Double amount, String collector, String clientName,
            String reference, Long collectionId, LocalDate operationDate, LocalDate captureDate) {
        super(source);
        this.amount = amount;
        this.collector = collector;
        this.clientName = clientName;
        this.reference = reference;
        this.collectionId = collectionId;
        this.operationDate = operationDate != null ? operationDate : LocalDate.now();
        this.captureDate = captureDate != null ? captureDate : this.operationDate;
    }
}
