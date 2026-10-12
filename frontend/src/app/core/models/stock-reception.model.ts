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
  articleId?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  entryPackagingMode?: 'UNIT' | 'WHOLESALE' | 'HALF_WHOLESALE' | null;
  packageCount?: number | null;
  packagePrice?: number | null;
  packagingTypeSnapshot?: 'NONE' | 'CARTON' | 'SAC' | null;
  unitsPerPackageSnapshot?: number | null;
  /** Prix catalogue du jour — préremplissage validation FIFO. */
  catalogPurchasePrice?: number | null;
  catalogWholesalePurchasePrice?: number | null;
  catalogHalfWholesalePurchasePrice?: number | null;
}

/** Prix saisis / affichés avant validation FIFO (source de vérité envoyée au backend). */
export interface StockReceptionValidateLine {
  itemId: number;
  unitPrice?: number;
  packagePrice?: number;
}

export interface StockReceptionValidateRequest {
  items: StockReceptionValidateLine[];
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
