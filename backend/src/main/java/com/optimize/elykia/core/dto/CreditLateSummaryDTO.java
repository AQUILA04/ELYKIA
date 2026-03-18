package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CreditLateSummaryDTO {
    /** Nombre total de crédits en retard */
    private long   totalLate;
    /** Crédits avec retard de délai (DELAI + DOUBLE) */
    private long   totalDelai;
    /** Crédits avec retard d'échéance (ECHEANCE + DOUBLE) */
    private long   totalEcheance;
    /** Somme des montants restants à recouvrer */
    private double totalAmountRemaining;
}
