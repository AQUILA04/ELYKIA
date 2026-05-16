/** Ligne article dans une demande ou un retour (réponse API). */
export interface StockOperationLineItem {
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  article?: { id?: number; name?: string };
}

/**
 * Represents a single Stock Request item returned by the API.
 * Covers both Standard (/api/stock-requests) and Tontine (/api/v1/stock-tontine-request) endpoints.
 */
export interface StockRequest {
  id: number;
  reference: string;
  status: string;
  createdAt: string;
  deliveryDate?: string;
  commercialUsername?: string;
  totalCreditSalePrice?: number;
  totalSalePrice?: number;
  totalPurchasePrice?: number;
  items?: StockOperationLineItem[];
  [key: string]: any; // Allow additional backend fields without breaking the model
}

/**
 * Story 2.2 — Payload interfaces for creating a Standard Stock Request.
 * CORRECT: StockRequestItem.java uses @ManyToOne Articles article — NOT variationId.
 * `collector` is injected by SecurityContextInterceptor — NOT included here.
 */
export interface StockRequestItemPayload {
  article: { id: number };
  quantity: number;
}

export interface CreateStockRequestPayload {
  items: StockRequestItemPayload[];
  // collector injected by SecurityContextInterceptor
}
