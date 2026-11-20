export interface StockLinkedSale {
  creditId: number;
  reference: string;
  clientFullName: string;
  totalAmount: number;
  beginDate: string;
  soldValueOnStock: number;
  paidAmount?: number;
  remainingAmount?: number;
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
  sumPaidAmount?: number;
  sumRemainingAmount?: number;
  /** Stock vendu = somme imputée au stock (tolérance 1 F, calculée par le serveur). */
  consistent?: boolean;
  gapAmount?: number;
  salesCount: number;
  sales: StockLinkedSale[];
}
