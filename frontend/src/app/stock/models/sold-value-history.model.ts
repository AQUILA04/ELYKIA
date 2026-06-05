export interface SoldValueHistoryEntry {
  id: number;
  stockItemId: number;
  creditId?: number;
  creditReference?: string;
  movementType: 'CREDIT_SALE' | 'CASH_SALE' | 'STOCK_IN' | 'RETURN' | 'ADJUSTMENT';
  quantity: number;
  saleUnitPrice: number;
  weightedAverageUnitPrice: number;
  previousTotalSoldValue: number;
  newTotalSoldValue: number;
  deltaValue: number;
  createdDate: string;
  createdBy?: string;
}

export interface CreditSaleDetail {
  reference: string;
  clientName: string;
  quantity: number;
}

export interface SoldValueHistoryRow extends SoldValueHistoryEntry {
  clientName?: string;
}
