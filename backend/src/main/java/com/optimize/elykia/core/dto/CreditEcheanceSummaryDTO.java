package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * KPIs affichés dans les 4 cartes du haut de la page "Crédits à échéance".
 */
@Getter
@Builder
public class CreditEcheanceSummaryDTO {

    /** Crédits arrivant à terme AUJOURD'HUI */
    private long   totalToday;

    /** Crédits arrivant à terme dans les 7 prochains jours (today inclus) */
    private long   totalWeek;

    /** Parmi les crédits de la semaine, ceux non encore soldés */
    private long   totalUnsettled;

    /**
     * Somme des montants restants à recouvrer sur les crédits
     * de la semaine (totalAmountRemaining > 0)
     */
    private double totalAmountRemaining;
}
