export interface TontineRequestItemPayload {
  article: { id: number };
  quantity: number;
}

export interface CreateTontineRequestPayload {
  requestDate?: string; // ISO date string e.g. "2023-10-25"
  items: TontineRequestItemPayload[];
  // clientId / contractReference not mapped on backend entity as discovered
}

export interface StockTontineRequest {
  id: number;
  reference?: string;
  collector?: string;
  status: string;
  requestDate?: string;
  items?: TontineRequestItemPayload[];
  [key: string]: any;
}
