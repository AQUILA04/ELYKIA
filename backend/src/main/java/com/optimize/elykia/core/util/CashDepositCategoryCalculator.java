package com.optimize.elykia.core.util;

import com.optimize.elykia.core.entity.report.DailyCommercialReport;

public final class CashDepositCategoryCalculator {

    private CashDepositCategoryCalculator() {
    }

    public static double creditToDeposit(DailyCommercialReport report) {
        if (report == null) {
            return 0.0;
        }
        return safe(report.getTotalAdvancesAmount())
                + safe(report.getCollectionsAmount())
                + safe(report.getTotalReliquatGeneratedAmount())
                - safe(report.getTotalReliquatUsedAmount());
    }

    public static double tontineToDeposit(DailyCommercialReport report) {
        if (report == null) {
            return 0.0;
        }
        return safe(report.getTontineCollectionsAmount());
    }

    public static double newBalanceToDeposit(DailyCommercialReport report) {
        if (report == null) {
            return 0.0;
        }
        return safe(report.getNewAccountsBalance());
    }

    public static double remainingCredit(DailyCommercialReport report) {
        return Math.max(0.0, creditToDeposit(report) - safeDeposited(report.getTotalCreditAmountDeposited()));
    }

    public static double remainingTontine(DailyCommercialReport report) {
        return Math.max(0.0, tontineToDeposit(report) - safeDeposited(report.getTotalTontineAmountDeposited()));
    }

    public static double remainingNewBalance(DailyCommercialReport report) {
        return Math.max(0.0, newBalanceToDeposit(report) - safeDeposited(report.getTotalNewBalanceAmountDeposited()));
    }

    public static void validateCategorySplit(Double amount, Double creditAmount, Double tontineAmount,
            Double newBalanceAmount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Le montant total du versement doit être supérieur à 0.");
        }
        double credit = safe(creditAmount);
        double tontine = safe(tontineAmount);
        double newBalance = safe(newBalanceAmount);
        if (credit < 0 || tontine < 0 || newBalance < 0) {
            throw new IllegalArgumentException("Les montants par catégorie ne peuvent pas être négatifs.");
        }
        double sum = credit + tontine + newBalance;
        if (Math.abs(sum - amount) > 0.01) {
            throw new IllegalArgumentException(
                    "La somme des catégories doit être égale au montant total du versement.");
        }
    }

    public static void normalizeLegacyAmounts(com.optimize.elykia.core.entity.report.CashDeposit deposit) {
        if (deposit.getCreditAmount() == null && deposit.getTontineAmount() == null
                && deposit.getNewBalanceAmount() == null) {
            deposit.setCreditAmount(deposit.getAmount());
            deposit.setTontineAmount(0.0);
            deposit.setNewBalanceAmount(0.0);
        }
    }

    private static double safe(Double value) {
        return value != null ? value : 0.0;
    }

    private static double safeDeposited(Double value) {
        return value != null ? value : 0.0;
    }
}
