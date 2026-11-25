package com.optimize.elykia.core.util;

import java.time.LocalDateTime;

/**
 * Résolution de la date d'opération transmise par le terminal.
 * Absente ou dans le futur (horloge du téléphone décalée) : on retient l'instant serveur.
 */
public final class OperationDates {

    private OperationDates() {
    }

    public static LocalDateTime resolve(LocalDateTime requested) {
        return resolve(requested, LocalDateTime.now());
    }

    public static LocalDateTime resolve(LocalDateTime requested, LocalDateTime now) {
        if (requested == null || requested.isAfter(now)) {
            return now;
        }
        return requested;
    }
}
