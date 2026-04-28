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
  items?: any[];
  [key: string]: any;
}
