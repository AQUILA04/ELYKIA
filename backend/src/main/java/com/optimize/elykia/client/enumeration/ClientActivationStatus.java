package com.optimize.elykia.client.enumeration;

/**
 * Statut d'activation du dossier client pour l'espace client.
 * Les clients créés par le staff restent {@link #ACTIVE}.
 * Les auto-inscriptions démarrent en {@link #PENDING}.
 */
public enum ClientActivationStatus {
    PENDING,
    ACTIVE,
    REJECTED
}
