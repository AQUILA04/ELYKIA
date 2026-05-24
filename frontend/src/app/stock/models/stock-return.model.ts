export enum StockReturnStatus {
  CREATED = 'CREATED',
  VALIDATED = 'VALIDATED',
  CANCELLED = 'CANCELLED',
  REFUSED = 'REFUSED'
}

export interface StockReturn {
  id?: number;
  collector?: string;
  returnDate?: string;
  status?: StockReturnStatus;
  items?: any[];
}

export interface StockReturnDto {
  commercial: string;
  targetStockId: number;
  returnDate: string;       // ISO date "YYYY-MM-DD"
  note?: string;
  items: StockReturnItemDto[];
}

export interface StockReturnItemDto {
  stockItemId: number;
  articleId: number;
  quantity: number;
  unitPrice: number;
}
