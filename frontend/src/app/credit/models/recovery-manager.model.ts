export interface CreditCloseItemDto {
  creditId: number;
  amount: number;
  isPartial: boolean;
}

export interface CloseCreditsRequestDto {
  items: CreditCloseItemDto[];
}

export interface RecoveryManagerOperation {
  id: number;
  recoveryManagerUsername: string;
  commercialUsername: string;
  creditId: number;
  creditTimelineId: number | null;
  amountCollected: number;
  isPartial: boolean;
  originalAmountRemaining: number;
  operationDate: string;
  reference: string;
  clientName: string;
  creditReference: string;
}

export interface CommercialRemittanceDto {
  commercialUsername: string;
  operationsCount: number;
  totalToRemit: number;
}

export interface RecoveryManagerReportSummaryDto {
  totalAmountCollected: number;
  totalOperationsCount: number;
  commercialsCount: number;
  remittanceByCommercial: CommercialRemittanceDto[];
}

/** Activité terrain du chef sur la période du rapport journalier. */
export interface RecoveryManagerActivityDto {
  creditControlsDone: number;
  creditControlsEvents: number;
  creditPortfolioTotal: number;
  creditControlsConforme: number;
  creditControlsEcart: number;
  creditCoveragePercent: number;
  tontineControlsDone: number;
  tontineControlsEvents: number;
  tontinePortfolioTotal: number;
  tontineControlsConforme: number;
  tontineControlsEcart: number;
  tontineCoveragePercent: number;
  creditClosuresCount: number;
  creditFullClosures: number;
  creditPartialClosures: number;
  creditCarnetVerifications: number;
  tontineCarnetVerifications: number;
}

/** Taux de recouvrement mensuel chef (retards délai app, stock live). */
export interface MonthlyRecoveryRateDto {
  year: number;
  month: number;
  amountCollectedByChef: number;
  latePortfolioDue: number;
  lateCreditsCount: number;
  operationsCount: number;
  recoveryRatePercent: number;
}

export interface CreditCloseResultDto {
  creditId: number;
  creditReference?: string;
  clientName?: string;
  errorMessage?: string;
  operation?: RecoveryManagerOperation;
}

export interface CloseCreditsResponseDto {
  successes: CreditCloseResultDto[];
  failures: CreditCloseResultDto[];
}

export interface RecoveryOperationsParams {
  startDate: string;
  endDate: string;
  recoveryManagerUsername?: string;
  commercialUsername?: string;
  page?: number;
  size?: number;
}

export interface ReportPeriodParams {
  startDate: string;
  endDate: string;
  recoveryManagerUsername?: string;
  commercialUsername?: string;
}

/** Board de pilotage du recouvrement (`GET /recovery-manager/board`). */
export type RecoveryBoardScope = 'TEAM' | 'MANAGER';

export type RecoveryAttentionType =
  | 'PENDING_ECARTS'
  | 'NEVER_CONTROLLED'
  | 'STALE_CONTROL'
  | 'RATE_BELOW_TARGET'
  | 'COVERAGE_BELOW_TARGET'
  | 'MANAGER_INACTIVE';

export interface RecoveryBoardAttention {
  type: RecoveryAttentionType;
  severity: 'HIGH' | 'MEDIUM';
  recoveryManagerUsername: string | null;
  count: number;
  amount: number;
  value: number | null;
  threshold: number | null;
  commercials: string[] | null;
  lastDate: string | null;
}

export interface RecoveryBoardPriorityLate {
  creditId: number;
  reference: string;
  clientName: string;
  clientQuarter: string | null;
  commercialUsername: string;
  amountDue: number;
  lateDays: number;
  expectedEndDate: string | null;
  latestControlStatus: 'CONFORME' | 'ECART' | string | null;
  latestObservedAt: string | null;
  latestDifferenceAmount: number | null;
  latestObservedBy: string | null;
}

export interface RecoveryBoardManagerRow {
  username: string;
  displayName: string | null;
  collectedAmount: number;
  operationsCount: number;
  monthCollectedAmount: number;
  monthRatePercent: number;
  previousMonthAmount: number;
  changePercent: number | null;
  creditCoveragePercent: number;
  tontineCoveragePercent: number;
  creditControlsDone: number;
  creditPortfolioTotal: number;
  tontineControlsDone: number;
  tontinePortfolioTotal: number;
  ecartsCount: number;
  carnetVerifications: number;
  lastOperationDate: string | null;
  todayPlanStatus: 'DRAFT' | 'ACTIVE' | 'CLOSED' | null;
  todayPlanQuarters: string[];
}

export interface RecoveryBoardDto {
  scope: RecoveryBoardScope;
  recoveryManagerUsername: string | null;
  startDate: string;
  endDate: string;
  collectedAmount: number;
  operationsCount: number;
  commercialsCount: number;
  remittanceByCommercial: CommercialRemittanceDto[];
  monthRate: {
    year: number;
    month: number;
    collectedAmount: number;
    latePortfolioDue: number;
    lateCreditsCount: number;
    ratePercent: number;
  };
  monthComparison: {
    currentStart: string;
    currentEnd: string;
    currentAmount: number;
    previousStart: string;
    previousEnd: string;
    previousAmount: number;
    changePercent: number | null;
  };
  monthCoverage: {
    creditControlsDone: number;
    creditPortfolioTotal: number;
    creditCoveragePercent: number;
    tontineControlsDone: number;
    tontinePortfolioTotal: number;
    tontineCoveragePercent: number;
  };
  targets: {
    monthlyRatePercent: number | null;
    coveragePercent: number | null;
    elapsedRatio: number;
  };
  trend: { date: string; amount: number; operationsCount: number }[];
  priorityLate: RecoveryBoardPriorityLate[];
  attention: RecoveryBoardAttention[];
  team: RecoveryBoardManagerRow[] | null;
}
