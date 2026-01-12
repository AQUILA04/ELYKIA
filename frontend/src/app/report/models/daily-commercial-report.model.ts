export interface DailyCommercialReport {
    id?: number;
    commercialUsername: string;
    date: string; // ISO Date string
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
}
