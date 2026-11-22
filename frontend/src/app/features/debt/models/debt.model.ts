export type DebtType = 'MERCHANDISE' | 'CASH_SHORTAGE' | 'CASH_SURPLUS' | 'INVENTORY_SHORTAGE';
export type DebtStatus = 'OPEN' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'CANCELLED';
export type DebtPeriodGrain = 'MONTH' | 'DAY';
export type DebtSettlementMode = 'CASH' | 'SURPLUS_OFFSET' | 'WRITE_OFF';
export type DebtHolderProfile = 'COMMERCIAL' | 'STOREKEEPER';

export interface DebtLine {
  id?: number;
  articleId?: number;
  articleName?: string;
  stockItemId?: number;
  inventoryItemId?: number;
  lineCode?: string;
  label?: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  priceBasis?: string;
  sortOrder?: number;
}

export interface DebtAllocation {
  debtDocumentId: number;
  debtReference: string;
  amount: number;
}

export interface DebtSettlement {
  id?: number;
  reference: string;
  settlementMode: DebtSettlementMode;
  amount: number;
  surplusDebtId?: number;
  note?: string;
  performedBy: string;
  performedAt: string;
  allocations?: DebtAllocation[];
}

export interface DebtDocument {
  id: number;
  reference: string;
  holderUsername: string;
  holderProfile: DebtHolderProfile;
  debtType: DebtType;
  periodGrain: DebtPeriodGrain;
  periodYear: number;
  periodMonth?: number;
  periodDay?: string;
  status: DebtStatus;
  grossAmount: number;
  offsetAmount: number;
  paidAmount: number;
  remainingAmount: number;
  monthlyStockId?: number;
  dailyReportId?: number;
  inventoryId?: number;
  createdBy?: string;
  dateReg?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  lines?: DebtLine[];
  settlements?: DebtSettlement[];
}

export interface DebtSummary {
  openDebtTotal: number;
  openSurplusTotal: number;
  netPosition: number;
  remainingByType: Record<string, number>;
  pendingMerchandiseMonths: number;
  pendingCashGaps: number;
}

export interface DebtSettleRequest {
  debtIds: number[];
  settlementMode: DebtSettlementMode;
  amount?: number;
  surplusDebtId?: number;
  note?: string;
}
