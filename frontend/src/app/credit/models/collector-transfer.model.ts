export interface CollectorTransferPair {
  oldCollector: string;
  newCollector: string;
  creditCount: number;
  totalSalesAmount: number;
  totalPaidAtTransfer: number;
  totalRemainingAtTransfer: number;
  firstTransferDate?: string;
  lastTransferDate?: string;
}

export interface CollectorTransferSummary {
  creditCount: number;
  totalSalesAmount: number;
  totalPaidAtTransfer: number;
  totalRemainingAtTransfer: number;
  byPair: CollectorTransferPair[];
}

export interface CollectorTransferDetail {
  historyId: number;
  creditId: number;
  creditReference?: string;
  creditStatus?: string;
  clientName?: string;
  clientPhone?: string;
  oldCollector: string;
  newCollector: string;
  totalAmount?: number;
  totalAmountPaid?: number;
  totalAmountRemaining?: number;
  currentAmountPaid?: number;
  currentAmountRemaining?: number;
  changeDate?: string;
  operatedBy?: string;
}

export interface CollectorTransferFilters {
  oldCollector?: string | null;
  newCollector?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}
