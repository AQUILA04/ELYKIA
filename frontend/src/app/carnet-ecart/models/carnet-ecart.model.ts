export type CarnetEcartDomain = 'CREDIT' | 'TONTINE';
export type CarnetEcartDirection = 'NOTEBOOK_ABOVE_SYSTEM' | 'SYSTEM_ABOVE_NOTEBOOK' | 'MIXED';
export type CarnetEcartStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type CarnetEcartQueue = 'PENDING' | 'INVERSE' | 'ACCEPTED' | 'REJECTED';

export interface CarnetEcartMonth {
  lineId: number;
  year: number;
  month: number;
  systemAmount: number;
  notebookAmount: number;
  differenceAmount: number;
  status: CarnetEcartStatus;
}

export interface CarnetEcartItem {
  key: string;
  domain: CarnetEcartDomain;
  controlId: number;
  commercialUsername: string | null;
  clientName: string | null;
  subjectReference: string | null;
  observedAt: string | null;
  systemAmount: number;
  notebookAmount: number;
  differenceAmount: number;
  direction: CarnetEcartDirection;
  status: CarnetEcartStatus;
  acceptableAmount: number;
  pendingInverseAmount: number;
  commercialKnown: boolean;
  months: CarnetEcartMonth[];
}

export interface CarnetEcartOutcome {
  key: string;
  message: string;
  amount?: number | null;
}

export interface CarnetEcartBulkResult {
  succeeded: CarnetEcartOutcome[];
  ignored: CarnetEcartOutcome[];
  errors: CarnetEcartOutcome[];
}
