package com.optimize.elykia.core.enumaration;

/** Etat de la part société d'un membre tontine. */
public enum TontineSocietyShareStatus {
    /** Calcul automatique, jamais confirmé ni corrigé. */
    AUTO,
    /** Montant saisi égal à la part existante : elle est confirmée. */
    CONFIRMED,
    /** Montant saisi différent : il remplace le calcul automatique. */
    ADJUSTED
}
