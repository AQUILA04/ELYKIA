package com.optimize.elykia.core.enumaration;

public enum TontineSocietyShareAdjustmentOutcome {
    /** Le montant saisi remplace la part société. */
    ADJUSTED,
    /** Le montant saisi est égal à la part existante : rien ne change, la part est confirmée. */
    VALIDATED,
    /** Saisie d'un commercial refusée : le chef de recouvrement a déjà validé ou corrigé la part. */
    REJECTED,
    /** Retour au calcul automatique (administrateur). */
    RESET
}
