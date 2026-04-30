export enum StockRequestStatus {
  CREATED = 'CREATED',
  VALIDATED = 'VALIDATED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface StockRequestItem {
  id?: number;
  article: any; // Article entity
  quantity: number;
  unitPrice?: number;
  purchasePrice?: number;
  itemName?: string;
}

export interface StockRequest {
  id?: number;
  reference?: string;
  collector?: string;
  requestDate?: string;
  validationDate?: string;
  deliveryDate?: string;
  status?: StockRequestStatus;
  items: StockRequestItem[];
  totalCreditSalePrice?: number;
  totalPurchasePrice?: number;
  accountingDate?: string;
}

export interface PartialDeliveryResponseDTO {
    deliveryType: 'FULL' | 'PARTIAL';
    deliveredRequestId: number;
    deliveredRequestReference: string;
    deliveredItems: DeliveredItemDTO[];
    pendingItems: PendingItemDTO[];
    pendingRequestId?: number;
    pendingRequestReference?: string;
}

export interface DeliveredItemDTO {
    itemName: string;
    quantity: number;
    unitPrice: number;
}

export interface PendingItemDTO {
    itemName: string;
    requestedQuantity: number;
    availableQuantity: number;
    unitPrice: number;
}
