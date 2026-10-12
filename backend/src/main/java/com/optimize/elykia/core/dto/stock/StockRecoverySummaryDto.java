package com.optimize.elykia.core.dto.stock;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class StockRecoverySummaryDto {
    double totalDueAmount;
    double totalRecoveredAmount;
    double totalRemainingAmount;
    double recoveryRatePercent;
    double remainingFromPhysicalStock;
    double recoveredFromSales;
    double remainingFromCredits;
    double totalCreditDepositedAmount;
    /** Valeur figée des quantités en dette (ouverte ou réglée). */
    double debtValueAmount;
    /** Part déjà réglée de la dette marchandise du mois. */
    double debtSettledAmount;
    /** Reste à payer sur la dette marchandise du mois. */
    double debtRemainingAmount;
    Long merchandiseDebtId;
}
