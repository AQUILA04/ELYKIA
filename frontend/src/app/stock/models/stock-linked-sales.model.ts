export interface StockLinkedSale {
  creditId: number;
  reference: string;
  clientFullName: string;
  totalAmount: number;
  beginDate: string;
  soldValueOnStock: number;
  type?: string;
  status?: string;
}

export interface StockLinkedSalesResponse {
  stockId: number;
  collector: string;
  month: number;
  year: number;
  stockSoldValue: number;
  sumCreditTotalAmount: number;
  sumSoldValueOnStock: number;
  salesCount: number;
  sales: StockLinkedSale[];
}
