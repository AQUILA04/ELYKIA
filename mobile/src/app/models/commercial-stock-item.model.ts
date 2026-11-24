export interface CommercialStockItem {
  id?: number;
  articleId: string;
  quantityRemaining: number;
  quantityTaken: number;
  quantitySold: number;
  quantityReturned: number;
  commercialUsername: string;
  month: number;
  year: number;
  updatedAt: string;
  unitPrice?: number;
}

export interface CommercialStockItemDto {
  articleId: string;
  articleName?: string;
  commercialName?: string;
  sellingPrice?: number;
  creditSalePrice?: number;
  quantityRemaining: number;
  quantityTaken?: number;
  quantitySold?: number;
  quantityReturned?: number;
  commercialUsername?: string;
  month?: number;
  year?: number;
}

export type StockActivityType = 'CREDIT' | 'TONTINE';

export interface ContinuousStockPositionDto {
  positionId: number;
  collector: string;
  articleId: number;
  activityType: StockActivityType;
  quantityOnHand: number;
  weightedAvgPurchaseCost?: number;
  currentSaleUnitPrice?: number;
}
