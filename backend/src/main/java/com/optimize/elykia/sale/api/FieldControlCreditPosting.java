package com.optimize.elykia.sale.api;

/**
 * Résultat de l'imputation d'un écart de carnet crédit (ventilation crédit / reliquat).
 */
public record FieldControlCreditPosting(
        double imputedOnCredit,
        double reliquat,
        double cash,
        String reference,
        String collector,
        String creditReference,
        boolean alreadyExisted
) {
}
