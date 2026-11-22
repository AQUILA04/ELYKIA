import { CreditSearchDto } from '../components/advanced-search/advanced-search.types';

export enum CreditListPeriodPreset {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  CUSTOM = 'CUSTOM'
}

export interface SalesTypeSummary {
  count: number;
  totalAmount: number;
  totalMargin: number;
}

export interface InProgressCreditSummary extends SalesTypeSummary {
  totalAmountRemaining: number;
}

export interface CreditListSummary {
  startDate: string;
  endDate: string;
  closedTotal: SalesTypeSummary;
  closedCredit: SalesTypeSummary;
  closedCash: SalesTypeSummary;
  closedTontine: SalesTypeSummary;
  inProgressCredit: InProgressCreditSummary;
  collectedCount: number;
  collectedAmount: number;
}

export interface CreditListSummaryRequest {
  startDate: string;
  endDate: string;
  search?: CreditSearchDto | null;
}

export interface CreditListState {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
  currentSearchDto: CreditSearchDto | null;
  showAdvancedSearch: boolean;
  periodPreset: CreditListPeriodPreset;
  customStartDate: string | null;
  customEndDate: string | null;
}
