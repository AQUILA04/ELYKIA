export interface TontineStock {
  id?: number;
  commercial: string;
  articleId: number;
  articleName: string;
  unitPrice: number;
  totalQuantity: number;
  availableQuantity: number;
  distributedQuantity: number;
  quantityReturned: number;
  weightedAverageUnitPrice: number;
  year: number;
  tontineSessionId?: number;
}
