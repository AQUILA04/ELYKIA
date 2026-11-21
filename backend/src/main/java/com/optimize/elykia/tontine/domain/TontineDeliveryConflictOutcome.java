package com.optimize.elykia.tontine.domain;

public enum TontineDeliveryConflictOutcome {
    /** Les articles ont été ajoutés à la commande déjà enregistrée. */
    MERGED,
    /** La saisie a été refusée. */
    REJECTED
}
