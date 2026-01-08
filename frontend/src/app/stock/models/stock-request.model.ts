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
