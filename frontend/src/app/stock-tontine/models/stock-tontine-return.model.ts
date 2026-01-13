export enum StockReturnStatus {
  CREATED = 'CREATED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED'
}

export interface StockTontineReturnItem {
  id?: number;
  article: any; // Article entity
  quantity: number;
}

export interface StockTontineReturn {
  id?: number;
  collector?: string;
  returnDate?: string;
  status?: StockReturnStatus;
  items: StockTontineReturnItem[];
}
