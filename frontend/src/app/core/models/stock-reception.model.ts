export interface StockReception {
  id: number;
  reference: string;
  receptionDate: string;
  receivedBy: string;
  totalAmount: number;
  items: StockReceptionItem[];
}

export interface StockReceptionItem {
  id: number;
  article: {
    id: number;
    name: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
