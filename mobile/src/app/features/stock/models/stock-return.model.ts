import { StockOperationLineItem } from './stock-request.model';

/**
 * Represents a single Stock Return item returned by the API.
 * Covers both Standard (/api/stock-returns) and Tontine (/api/v1/stock-tontine-return) endpoints.
 *
 * `reference` is optional because the backend may omit it for records that have
 * not yet been fully processed. The template falls back to `id` in that case.
 */
export interface StockReturn {
  id: number;
  reference?: string;
  status: string;
  createdAt: string;
  commercialUsername?: string;
  totalSalePrice?: number;
  totalAmount?: number;
  totalCreditSalePrice?: number;
  items?: StockOperationLineItem[];
  [key: string]: any;
}

/**
 * Story 2.3 — Payload interfaces for creating a Standard Stock Return.
 * CORRECT: StockReturnItem.java uses @ManyToOne Articles article — NOT variationId.
 * `comment` requires `private String comment` in StockReturn.java (backend entity change).
 * `collector` is injected by SecurityContextInterceptor — NOT included here.
 */
export interface StockReturnItemPayload {
  article: { id: number };
  quantity: number;
}

export interface CreateStockReturnPayload {
  items: StockReturnItemPayload[];
  comment?: string; // Optional — requires backend StockReturn.java entity change
  // collector injected by SecurityContextInterceptor
}
