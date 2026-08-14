package com.optimize.elykia.core.dto.report;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CommercialYearlySummaryDto {
    int year;
    String commercialUsername;
    /** Ouvertures : ventes démarrées par le commercial sur l'année (journalier). */
    double totalCreditSalesAmount;
    int totalCreditSalesCount;
    double totalCreditDepositedAmount;
    /** Somme des totalAmountPaid sur les crédits actuellement chez le commercial. */
    double totalCreditPaidOnCreditsAmount;
    /** Stock d'ouverture au 01/01 (restes des crédits détenus à cette date). */
    double openingStockAmount;
    /** Créances reçues par passation durant l'année. */
    double creditsReceivedAmount;
    /** Créances cédées par passation durant l'année. */
    double creditsCededAmount;
    /** stock + ouvertures + reçues − cédées. */
    double entrustedPortfolioAmount;
    /** Portefeuille confié − versements remis au secrétaire. */
    double remainingAtCommercialAmount;
    /** Somme live des totalAmountRemaining (portefeuille client actuel). */
    double remainingAtClientAmount;
}
