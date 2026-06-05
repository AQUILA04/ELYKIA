export type TontineStockMovementType = 'STOCK_IN' | 'TONTINE_DELIVERY' | 'RETURN';

export interface TontineStockMovement {
  id: number;
  tontineStockId: number;
  creditId?: number;
  creditReference?: string;
  stockTontineRequestId?: number;
  stockTontineRequestReference?: string;
  stockTontineReturnId?: number;
  tontineDeliveryId?: number;
  tontineDeliveryReference?: string; // ex. LIV-2026-06-EB934TL0
  collector: string;
  articleId: number;
  articleName?: string;
  movementType: TontineStockMovementType;
  quantityBefore: number;
  quantityMoved: number;
  quantityAfter: number;
  operationDate: string;
}
