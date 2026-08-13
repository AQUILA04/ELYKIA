export interface CommercialYearlySummary {
    year: number;
    commercialUsername: string;
    totalCreditSalesAmount: number;
    totalCreditSalesCount: number;
    totalCreditDepositedAmount: number;
    /** Somme des totalAmountPaid sur les crédits débutés dans l'année. */
    totalCreditPaidOnCreditsAmount: number;
    /** Ventes − versements remis au secrétaire. */
    remainingAtCommercialAmount: number;
    /** Somme des totalAmountRemaining (crédits encore dus). */
    remainingAtClientAmount: number;
}
