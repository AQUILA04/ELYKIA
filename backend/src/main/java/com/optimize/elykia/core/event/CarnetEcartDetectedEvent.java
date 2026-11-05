package com.optimize.elykia.core.event;

import lombok.Getter;

import java.util.List;

/**
 * Écart de carnet déjà enregistré. Les valeurs sont copiées avant le commit :
 * le listener s'exécute après, session fermée.
 */
@Getter
public class CarnetEcartDetectedEvent {

    private final List<Item> items;

    public CarnetEcartDetectedEvent(List<Item> items) {
        this.items = List.copyOf(items);
    }

    @Getter
    public static final class Item {
        private final String commercialUsername;
        private final String clientName;
        private final Long controlId;
        private final String referenceKey;
        private final double amount;

        public Item(String commercialUsername, String clientName, Long controlId, String referenceKey, double amount) {
            this.commercialUsername = commercialUsername;
            this.clientName = clientName;
            this.controlId = controlId;
            this.referenceKey = referenceKey;
            this.amount = amount;
        }
    }
}
