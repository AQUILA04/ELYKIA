package com.optimize.elykia.core.service.adhesion;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.enumaration.AdhesionType;

/**
 * Plafonds de crédit par type d'adhésion.
 * Personnel : plafond fixe. Business et événement : solde de l'adhésion multiplié par le coefficient.
 */
public final class CreditCeilingPolicy {

    public static final double DEFAULT_PERSONAL_CEILING = 35_000d;
    public static final double DEFAULT_PERSONAL_FEE = 500d;
    public static final double DEFAULT_BUSINESS_FEE = 2_000d;
    public static final double DEFAULT_EVENT_FEE = 2_000d;

    private CreditCeilingPolicy() {
    }

    public static double ceiling(AdhesionType type, double balance, int dividend, double personalCeiling) {
        if (type == AdhesionType.PERSONAL) {
            return personalCeiling;
        }
        return balance * dividend;
    }

    public static void assertWithinCeiling(
            AdhesionType type,
            double amount,
            double balance,
            int dividend,
            double personalCeiling) {
        if (amount <= 0) {
            throw new CustomValidationException("Le montant du crédit doit être positif.");
        }
        if (type == AdhesionType.PERSONAL) {
            if (amount > personalCeiling) {
                throw new CustomValidationException(
                        "Le montant du crédit dépasse le plafond personnel de "
                                + (long) personalCeiling + " FCFA.");
            }
            return;
        }
        if (dividend <= 0) {
            throw new CustomValidationException("Le coefficient de crédit est invalide.");
        }
        if ((amount / dividend) > balance) {
            long max = (long) Math.floor(balance * dividend);
            throw new CustomValidationException(
                    "Le montant du crédit dépasse le plafond de " + max + " FCFA pour cette adhésion.");
        }
    }
}
