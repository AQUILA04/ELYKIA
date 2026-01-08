export enum StockReturnStatus {
  CREATED = 'CREATED',
  RECEIVED = 'RECEIVED'
}

export interface StockReturnItem {
  id?: number;
  article: any;
  quantity: number;
}

export interface StockReturn {
  id?: number;
  collector?: string;
  returnDate?: string;
  status?: StockReturnStatus;
  items: StockReturnItem[];
}
