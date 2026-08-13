package com.optimize.elykia.core.dto.report;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CommercialYearlySummaryDto {
    int year;
    String commercialUsername;
    double totalCreditSalesAmount;
    int totalCreditSalesCount;
    double totalCreditDepositedAmount;
    /** Somme des totalAmountPaid sur les crédits débutés dans l'année. */
    double totalCreditPaidOnCreditsAmount;
    /** Ventes − versements remis au secrétaire. */
    double remainingAtCommercialAmount;
    /** Somme des totalAmountRemaining (crédits de l'année encore dus). */
    double remainingAtClientAmount;
}
