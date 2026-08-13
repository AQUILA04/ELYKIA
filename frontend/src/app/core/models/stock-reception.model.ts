export type StockReceptionStatus = 'PENDING' | 'VALIDATED' | 'REFUSED' | 'CANCELLED';

export interface StockReceptionListItem {
  id: number;
  reference: string;
  receptionDate: string;
  receivedBy: string;
  totalAmount: number;
  status: StockReceptionStatus;
}

export interface StockReception extends StockReceptionListItem {
  validatedBy?: string;
  validatedAt?: string;
  refusedBy?: string;
  refusedAt?: string;
  refusalReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
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
