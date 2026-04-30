/**
 * Represents a single Stock Request item returned by the API.
 * Covers both Standard (/api/stock-requests) and Tontine (/api/v1/stock-tontine-request) endpoints.
 */
export interface StockRequest {
  id: number;
  reference: string;
  status: string;
  createdAt: string;
  commercialUsername?: string;
  items?: any[];
  [key: string]: any; // Allow additional backend fields without breaking the model
}
