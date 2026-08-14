export interface CommercialYearlySummary {
    year: number;
    commercialUsername: string;
    /** Ouvertures : ventes démarrées sur l'année. */
    totalCreditSalesAmount: number;
    totalCreditSalesCount: number;
    totalCreditDepositedAmount: number;
    /** Payé consigné sur les crédits actuellement chez le commercial. */
    totalCreditPaidOnCreditsAmount: number;
    /** Stock d'ouverture au 01/01. */
    openingStockAmount: number;
    /** Créances reçues par passation durant l'année. */
    creditsReceivedAmount: number;
    /** Créances cédées par passation durant l'année. */
    creditsCededAmount: number;
    /** stock + ouvertures + reçues − cédées. */
    entrustedPortfolioAmount: number;
    /** Portefeuille confié − versements. */
    remainingAtCommercialAmount: number;
    /** Somme live des soldes clients. */
    remainingAtClientAmount: number;
}
