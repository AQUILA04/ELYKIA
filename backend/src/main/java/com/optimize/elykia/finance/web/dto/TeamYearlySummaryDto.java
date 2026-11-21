package com.optimize.elykia.finance.web.dto;

/**
 * Portefeuille crédit de l'équipe sur l'année (somme des bilans par commercial).
 *
 * @param year                    année
 * @param commercialsCount        commerciaux ayant un rapport dans l'année
 * @param entrustedPortfolioAmount portefeuille confié : stock ouverture + ventes + reçues − cédées
 * @param creditDepositedAmount   versements crédit
 * @param remainingAtCommercialAmount portefeuille − versements
 * @param remainingAtClientAmount soldes restant chez les clients
 * @param merchandiseDebtGlobalAmount dette marchandise
 * @param merchandiseDebtSettledAmount dette marchandise réglée
 */
public record TeamYearlySummaryDto(
        int year,
        int commercialsCount,
        double entrustedPortfolioAmount,
        double creditDepositedAmount,
        double remainingAtCommercialAmount,
        double remainingAtClientAmount,
        double merchandiseDebtGlobalAmount,
        double merchandiseDebtSettledAmount) {
}
