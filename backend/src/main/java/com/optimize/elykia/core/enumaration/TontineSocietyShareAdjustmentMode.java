package com.optimize.elykia.core.enumaration;

/** Réajustement de la part société pour une session tontine. */
public enum TontineSocietyShareAdjustmentMode {
    /** Etape imposée avant la commande ou la livraison directe tant que la part n'est ni validée ni corrigée. */
    MANDATORY,
    /** Réajustement possible, jamais imposé. */
    OPTIONAL,
    /** Aucun réajustement : les boutons sont cachés et le serveur refuse les saisies. */
    DISABLED;

    public static TontineSocietyShareAdjustmentMode orDefault(TontineSocietyShareAdjustmentMode mode) {
        return mode != null ? mode : DISABLED;
    }
}
