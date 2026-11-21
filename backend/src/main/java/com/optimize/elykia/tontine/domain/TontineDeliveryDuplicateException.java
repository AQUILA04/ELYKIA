package com.optimize.elykia.tontine.domain;

import com.optimize.common.entities.exception.CustomValidationException;
import lombok.Getter;

/**
 * Seconde saisie refusée pour un membre qui a déjà une commande ou une livraison.
 * Renvoyée en HTTP 409 : le mobile ne propose pas de l'enregistrer hors ligne à la place.
 */
@Getter
public class TontineDeliveryDuplicateException extends CustomValidationException {

    private final TontineDeliveryConflictReason reason;

    public TontineDeliveryDuplicateException(TontineDeliveryConflictReason reason, String message) {
        super(message);
        this.reason = reason;
    }
}
