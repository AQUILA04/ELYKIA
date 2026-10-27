package com.optimize.elykia.core.enumaration;

import com.optimize.common.entities.exception.ApplicationException;

import java.util.Locale;

/**
 * Filtre de la liste Terrain en ligne.
 * ALL = tous les dossiers, TODO = jamais contrôlés, DONE = déjà contrôlés, quelle que soit la date.
 */
public enum RmFieldListProgress {
    ALL,
    TODO,
    DONE;

    public static RmFieldListProgress from(String raw) {
        if (raw == null || raw.isBlank()) {
            return ALL;
        }
        try {
            return valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ApplicationException("Filtre d'avancement inconnu");
        }
    }
}
