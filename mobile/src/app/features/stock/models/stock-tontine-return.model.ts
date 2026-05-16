export interface TontineReturnItemPayload {
  article: { id: number };
  quantity: number;
}

export interface CreateTontineReturnPayload {
  items: TontineReturnItemPayload[];
  comment?: string;
  // collector injected by SecurityContextInterceptor
}

export interface StockTontineReturn {
  id: number;
  reference?: string;
  collector?: string;
  status: string;
  createdAt?: string;
  items?: TontineReturnItemPayload[];
  comment?: string;
  [key: string]: any;
}
