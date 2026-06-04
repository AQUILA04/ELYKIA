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
