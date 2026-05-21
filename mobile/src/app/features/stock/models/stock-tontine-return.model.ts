export interface TontineReturnItemPayload {
  article: { id: number };
  quantity: number;
}

export interface CreateTontineReturnPayload {
  collector?: string;
  items: TontineReturnItemPayload[];
  comment?: string;
}

export interface StockTontineReturn {
  id: number;
  reference?: string;
  collector?: string;
  status: string;
  returnDate?: string;
  items?: TontineReturnItemPayload[];
  comment?: string;
}
