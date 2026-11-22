export enum StockReturnStatus {
  CREATED = 'CREATED',
  VALIDATED = 'VALIDATED',
  CANCELLED = 'CANCELLED',
  REFUSED = 'REFUSED'
}

export interface StockReturnListItem {
  id?: number;
  collector?: string;
  returnDate?: string;
  receivedDate?: string;
  status?: StockReturnStatus;
}

export interface StockReturn {
  id?: number;
  collector?: string;
  returnDate?: string;
  receivedDate?: string;
  status?: StockReturnStatus;
  items?: StockReturnItem[];
}

export interface StockReturnItem {
  id?: number;
  article?: {
    type?: string;
    marque?: string;
    model?: string;
    name?: string;
  };
  quantity?: number;
  unitPrice?: number;
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
