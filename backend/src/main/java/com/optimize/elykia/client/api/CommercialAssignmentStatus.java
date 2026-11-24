package com.optimize.elykia.client.api;

/** Statut de l'affectation d'un commercial sur un client ou un carnet tontine. */
public enum CommercialAssignmentStatus {
    /** Actif : peut consulter et enregistrer de nouvelles opérations. */
    ACTIVE,
    /** Inactif : consultation seule sur ses propres opérations déjà réalisées ; réactivable à tout moment. */
    INACTIVE
}
