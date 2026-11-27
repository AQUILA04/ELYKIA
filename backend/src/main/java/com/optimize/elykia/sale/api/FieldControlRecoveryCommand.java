package com.optimize.elykia.sale.api;

/**
 * Commande de régularisation d'un écart de carnet accepté sur un crédit.
 */
public record FieldControlRecoveryCommand(
        Long creditId,
        double cashAmount,
        String reference
) {
}
