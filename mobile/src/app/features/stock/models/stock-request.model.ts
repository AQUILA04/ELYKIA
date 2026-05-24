/** Ligne article dans une demande ou un retour (réponse API). */
export interface StockOperationLineItem {
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  article?: { id?: number; name?: string };
}

/**
 * Demande de stock standard ou tontine (réponse API).
 * Dates : le backend expose `requestDate` (pas `createdAt`, ignoré côté JPA).
 */
export interface StockRequest {
  id: number;
  reference?: string;
  status: string;
  collector?: string;
  requestDate?: string;
  /** Non renvoyé par le backend (createdDate est @JsonIgnore) — conservé pour compatibilité UI. */
  createdAt?: string;
  validationDate?: string;
  deliveryDate?: string;
  commercialUsername?: string;
  totalCreditSalePrice?: number;
  totalSalePrice?: number;
  totalPurchasePrice?: number;
  items?: StockOperationLineItem[];
  updatedAt?: string;
}

export interface StockRequestItemPayload {
  article: { id: number };
  quantity: number;
}

/** POST /api/stock-requests/create — corps attendu par StockRequestCreateDto. */
export interface StockRequestCreateDto {
  request: {
    collector?: string;
    items: StockRequestItemPayload[];
  };
  forNextMonth?: boolean;
}

/** @deprecated Utiliser StockRequestCreateDto via StockApiService.createStandardRequest */
export interface CreateStockRequestPayload {
  items: StockRequestItemPayload[];
  forNextMonth?: boolean;
}
