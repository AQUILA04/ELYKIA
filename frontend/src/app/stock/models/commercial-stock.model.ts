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
}
