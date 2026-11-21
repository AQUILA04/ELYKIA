package com.optimize.elykia.finance.web.dto;

/**
 * Totaux des versements d'une période, ventilés par compte.
 *
 * @param depositsCount    versements (hors lignes de rattrapage rattachées)
 * @param amount           montant total
 * @param creditAmount     part crédit
 * @param tontineAmount    part tontine (rattrapages compris)
 * @param newBalanceAmount part solde nouveaux comptes
 * @param surplusAmount    surplus non catégorisé
 */
public record CashDepositTotalsDto(long depositsCount, double amount, double creditAmount, double tontineAmount,
        double newBalanceAmount, double surplusAmount) {

    public static CashDepositTotalsDto empty() {
        return new CashDepositTotalsDto(0L, 0.0, 0.0, 0.0, 0.0, 0.0);
    }
}
