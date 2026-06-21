export interface StockRecoverySummary {
  totalDueAmount: number;
  totalRecoveredAmount: number;
  totalRemainingAmount: number;
  recoveryRatePercent: number;
  remainingFromPhysicalStock: number;
  recoveredFromSales: number;
  remainingFromCredits: number;
  totalCreditDepositedAmount?: number;
}

export interface CommercialMonthlyStockItem {
  id?: number;
  article: any;
  quantityTaken: number;
  quantitySold: number;
  quantityReturned: number;
  quantityRemaining: number;
  weightedAverageUnitPrice: number;
  weightedAveragePurchasePrice: number;
  totalSoldValue?: number;
  lastUnitPrice?: number;
}

export interface CommercialMonthlyStock {
  id?: number;
  collector: string;
  month: number;
  year: number;
  items: CommercialMonthlyStockItem[];
  recoverySummary?: StockRecoverySummary;
}
