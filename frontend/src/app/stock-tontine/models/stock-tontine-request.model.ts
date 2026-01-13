export enum StockRequestStatus {
  CREATED = 'CREATED',
  VALIDATED = 'VALIDATED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface StockTontineRequestItem {
  id?: number;
  article: any; // Article entity
  quantity: number;
  unitPrice?: number;
  purchasePrice?: number;
  itemName?: string;
}

export interface StockTontineRequest {
  id?: number;
  reference?: string;
  collector?: string;
  requestDate?: string;
  validationDate?: string;
  deliveryDate?: string;
  status?: StockRequestStatus;
  items: StockTontineRequestItem[];
  totalSalePrice?: number;
  totalPurchasePrice?: number;
  accountingDate?: string;
}
