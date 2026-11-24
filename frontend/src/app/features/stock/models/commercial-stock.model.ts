export interface StockRecoverySummary {
  totalDueAmount: number;
  totalRecoveredAmount: number;
  totalRemainingAmount: number;
  recoveryRatePercent: number;
  remainingFromPhysicalStock: number;
  recoveredFromSales: number;
  remainingFromCredits: number;
  totalCreditDepositedAmount?: number;
  debtValueAmount?: number;
  debtSettledAmount?: number;
  debtRemainingAmount?: number;
  merchandiseDebtId?: number;
}

export interface CommercialMonthlyStockItem {
  id?: number;
  article: any;
  quantityTaken: number;
  quantitySold: number;
  quantityReturned: number;
  quantityRemaining: number;
  quantityDebt?: number;
  debtUnitPrice?: number;
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

export type StockActivityType = 'CREDIT' | 'TONTINE';

export interface ContinuousStockLayerView {
  layerId: number;
  quantityRemaining: number;
  unitPurchaseCost: number;
  effectiveSalePrice?: number;
}

export interface ContinuousStockPositionView {
  positionId: number;
  collector: string;
  articleId: number;
  activityType: StockActivityType;
  quantityOnHand: number;
  weightedAvgPurchaseCost?: number;
  currentSaleUnitPrice?: number;
  layers: ContinuousStockLayerView[];
}

export interface ContinuousStockPeriodRowView {
  collector: string;
  articleId: number;
  activityType: StockActivityType;
  openingQuantity: number;
  inQuantity: number;
  soldQuantity: number;
  returnedQuantity: number;
  transferNetQuantity: number;
  debtQuantity: number;
  adjustmentNetQuantity: number;
  closingQuantity: number;
  soldValue: number;
  purchaseCostOfSold: number;
  realizedMargin: number;
  hasBackdatedMovements: boolean;
}

export interface ContinuousStockTeamRowView {
  collector: string;
  activityType: StockActivityType;
  openingQuantity: number;
  inQuantity: number;
  soldQuantity: number;
  returnedQuantity: number;
  transferNetQuantity: number;
  debtQuantity: number;
  closingQuantity: number;
  soldValue: number;
  realizedMargin: number;
}

export interface ContinuousStockMovementView {
  id: number;
  collector: string;
  articleId: number;
  activityType: StockActivityType;
  movementType: string;
  deltaQuantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitPurchaseCost?: number;
  unitSalePrice?: number;
  marginAmount?: number;
  referenceType?: string;
  referenceId?: number;
  referenceCode?: string;
  accountingDate: string;
  occurredAt: string;
  backdated: boolean;
  performedBy?: string;
}
