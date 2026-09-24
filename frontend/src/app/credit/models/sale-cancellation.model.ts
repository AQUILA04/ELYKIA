export interface SaleCancellationFilter {
  commercialUsername: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  creditStatus?: string | null;
}

export interface SaleCancellationExecuteRequest {
  commercialUsername: string;
  startDate: string;
  endDate: string;
  creditStatus?: string | null;
  cancellationReason: string;
}

export interface EligibleSaleItem {
  creditId: number;
  reference: string;
  clientName: string;
  saleDate: string;
  creditStatus: string;
  totalAmount: number;
  advance: number;
  articlesSummary: string;
}

export interface ExcludedSaleItem {
  creditId: number;
  reference: string;
  clientName: string;
  saleDate: string;
  totalAmount: number;
  paidAmount: number;
  reason: string;
}

export interface StockImpactItem {
  articleId: number;
  articleCode: string;
  articleName: string;
  quantityToReturn: number;
}

export interface SaleCancellationPreview {
  commercialUsername: string;
  startDate: string;
  endDate: string;
  totalSalesFound: number;
  eligibleCount: number;
  eligibleAmount: number;
  excludedCount: number;
  excludedAmount: number;
  eligibleSales: EligibleSaleItem[];
  excludedSales: ExcludedSaleItem[];
  stockImpacts: StockImpactItem[];
}

export interface SaleCancellationFileDto {
  id: number;
  fileName: string;
  fileType: string;
  creditReference?: string;
  clientName?: string;
  amount?: number;
}

export interface SaleCancellationRun {
  id: number;
  commercialUsername: string;
  startDate: string;
  endDate: string;
  creditStatus?: string;
  status: 'PENDING' | 'ARCHIVING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  cancellationReason: string;
  triggeredBy: string;
  createdDate: string;
  totalSalesFound: number;
  cancelledSalesCount: number;
  cancelledSalesAmount: number;
  excludedSalesCount: number;
  excludedSalesAmount: number;
  pdfFileCount: number;
  archiveFileName?: string;
  errorMessage?: string;
  files?: SaleCancellationFileDto[];
}
