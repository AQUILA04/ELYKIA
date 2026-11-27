package com.optimize.elykia.sale.domain;

import com.optimize.common.entities.exception.CustomValidationException;

/**
 * Value Object immuable représentant un paiement de recouvrement à imputer sur un {@link Credit}.
 */
public record RecoveryPayment(
        double amount,
        double reliquatGeneratedAmount,
        double reliquatUsedAmount,
        String reference,
        String commercialUsername,
        String operationConsentCode,
        Double confirmedAmount,
        String syncConsentCode,
        RecoverySource source
) {
    public RecoveryPayment {
        if (!Double.isFinite(amount) || amount <= 0.0) {
            throw new CustomValidationException(
                    "Le montant du recouvrement doit être strictement positif.");
        }
        if (!Double.isFinite(reliquatGeneratedAmount) || reliquatGeneratedAmount < 0.0) {
            throw new CustomValidationException(
                    "Le montant du reliquat généré ne peut pas être négatif.");
        }
        if (!Double.isFinite(reliquatUsedAmount) || reliquatUsedAmount < 0.0) {
            throw new CustomValidationException(
                    "Le montant du reliquat utilisé ne peut pas être négatif.");
        }
        if (source == null) {
            source = RecoverySource.WEB_SINGLE;
        }
    }
}
