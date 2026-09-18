package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * Taux de recouvrement mensuel du chef : encaissé terrain (ops) / dû live des retards délai app.
 */
@Getter
@Setter
@Builder
public class MonthlyRecoveryRateDto {
    private Integer year;
    private Integer month;
    /** Σ amountCollected des opérations du chef sur le mois. */
    private Double amountCollectedByChef;
    /** Σ totalAmountRemaining (net reliquat) de tous les crédits en retard délai (live). */
    private Double latePortfolioDue;
    /** Nombre de crédits en retard délai (live, app entière). */
    private Long lateCreditsCount;
    /** Nombre d'opérations RM du chef sur le mois. */
    private Integer operationsCount;
    /**
     * (amountCollectedByChef / latePortfolioDue) × 100.
     * 0 si le dénominateur est nul.
     */
    private Double recoveryRatePercent;
}
