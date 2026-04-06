export enum LateType {
  DELAI = 'DELAI',
  ECHEANCE = 'ECHEANCE'
}

export interface CreditLateDTO {
  id: number;
  reference: string;
  clientName: string;
  clientPhone: string;
  collector: string;
  totalAmount: number;
  totalAmountPaid: number;
  totalAmountRemaining: number;
  dailyStake: number;
  beginDate: string;
  expectedEndDate: string;
  remainingDaysCount: number;
  lateDaysDelai: number;
  lateDaysEcheance: number;
  lateType: LateType;
  status: string;
}

export interface CreditLateSummaryDTO {
  totalLate: number;
  totalDelai: number;
  totalEcheance: number;
  totalAmountRemaining: number;
}
