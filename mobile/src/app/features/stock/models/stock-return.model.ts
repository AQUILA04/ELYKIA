import { StockOperationLineItem } from './stock-request.model';

/**
 * Retour de stock standard ou tontine (réponse API).
 * Standard : champ commentaire = `note`. Tontine : `comment`.
 */
export interface StockReturn {
  id: number;
  reference?: string;
  status: string;
  collector?: string;
  returnDate?: string;
  /** Non renvoyé par le backend — conservé pour compatibilité UI. */
  createdAt?: string;
  receivedDate?: string;
  note?: string;
  comment?: string;
  commercialUsername?: string;
  totalSalePrice?: number;
  totalAmount?: number;
  totalCreditSalePrice?: number;
  totalPurchasePrice?: number;
  items?: StockOperationLineItem[];
  validationDate?: string;
}

export interface StockReturnItemPayload {
  article: { id: number };
  quantity: number;
}

/** POST /api/stock-returns/create — entité StockReturn (sans id). */
export interface StockReturnCreateBody {
  collector?: string;
  items: StockReturnItemPayload[];
  note?: string;
}

/** @deprecated Utiliser StockReturnCreateBody ; `comment` est mappé vers `note` dans le service. */
export interface CreateStockReturnPayload {
  items: StockReturnItemPayload[];
  comment?: string;
}
