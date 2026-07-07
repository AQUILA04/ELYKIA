export interface StockReceptionListItem {
  id: number;
  reference: string;
  receptionDate: string;
  receivedBy: string;
  totalAmount: number;
  status: 'VALIDATED' | 'CANCELLED';
}

export interface StockReception extends StockReceptionListItem {
  items?: StockReceptionItem[];
}

export interface StockReceptionItem {
  id: number;
  article?: {
    id: number;
    name: string;
  };
  articleName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PagedResponse<T> {
  content: T[];
  page: {
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  };
}
