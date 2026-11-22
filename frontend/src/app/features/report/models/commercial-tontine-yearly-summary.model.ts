export interface CommercialTontineYearlySummary {
    year: number;
    commercialUsername: string;
    totalTontineCollectionsAmount: number;
    totalTontineCollectionsCount: number;
    totalTontineDepositedAmount: number;
    remainingAtCommercialAmount: number;
    /** Somme des carnets du dernier contrôle terrain. */
    controlledNotebookAmount?: number;
    /** Écarts encore ouverts, carnet supérieur au système. */
    pendingNotebookAboveSystemAmount?: number;
}
