package com.optimize.elykia.sale.api;

import com.optimize.elykia.sale.domain.RecoverySource;

/**
 * Commande unitaire d'enregistrement d'un recouvrement sur un crédit.
 * Si {@code amount} est {@code null} (compatibilité ascendante avec l'ancien flux
 * {@code default-daily-stake}), le moteur résout le montant à {@code min(dailyStake, totalAmountRemaining)}.
 */
public record RecordRecoveryCommand(
        Long creditId,
        Double amount,
        String reference,
        String collector,
        Double reliquatGeneratedAmount,
        Double reliquatUsedAmount,
        String operationConsentCode,
        Double confirmedAmount,
        String syncConsentCode,
        RecoverySource source
) {
}
