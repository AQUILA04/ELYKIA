export interface DailyCommercialReport {
    id?: number;
    commercialUsername: string;
    date: string;
    totalStockRequestAmount: number;
    creditSalesCount: number;
    creditSalesAmount: number;
    newClientsCount: number;
    newAccountsBalance: number;
    collectionsCount: number;
    collectionsAmount: number;
    ordersCount: number;
    ordersAmount: number;
    tontineMembersCount: number;
    tontineCollectionsCount: number;
    tontineCollectionsAmount: number;
    tontineDeliveriesCount: number;
    tontineDeliveriesAmount: number;
    totalAmountToDeposit: number;
    totalAmountDeposited: number;
    totalCreditAmountDeposited?: number;
    totalTontineAmountDeposited?: number;
    totalNewBalanceAmountDeposited?: number;
    creditSalesMargin?: number;
    stockRequestMargin?: number;
    totalAdvancesAmount?: number;
    recoveryManagerCollectionsAmount?: number;
    totalReliquatGeneratedAmount?: number;
    totalReliquatUsedAmount?: number;
}

export function creditToDeposit(report: DailyCommercialReport): number {
    return (report.totalAdvancesAmount || 0)
        + (report.collectionsAmount || 0)
        + (report.totalReliquatGeneratedAmount || 0)
        - (report.totalReliquatUsedAmount || 0);
}

export function tontineToDeposit(report: DailyCommercialReport): number {
    return report.tontineCollectionsAmount || 0;
}

export function newBalanceToDeposit(report: DailyCommercialReport): number {
    return report.newAccountsBalance || 0;
}

export function remainingCredit(report: DailyCommercialReport): number {
    return Math.max(0, creditToDeposit(report) - (report.totalCreditAmountDeposited || 0));
}

export function remainingTontine(report: DailyCommercialReport): number {
    return Math.max(0, tontineToDeposit(report) - (report.totalTontineAmountDeposited || 0));
}

export function remainingNewBalance(report: DailyCommercialReport): number {
    return Math.max(0, newBalanceToDeposit(report) - (report.totalNewBalanceAmountDeposited || 0));
}

export function totalRemainingToDeposit(report: DailyCommercialReport): number {
    return remainingCredit(report) + remainingTontine(report) + remainingNewBalance(report);
}
