export interface TontineRequestItemPayload {
  article: { id: number };
  quantity: number;
}

export interface CreateTontineRequestPayload {
  collector?: string;
  requestDate?: string;
  items: TontineRequestItemPayload[];
}

export interface StockTontineRequest {
  id: number;
  reference?: string;
  collector?: string;
  status: string;
  requestDate?: string;
  totalSalePrice?: number;
  totalPurchasePrice?: number;
  items?: TontineRequestItemPayload[];
}
