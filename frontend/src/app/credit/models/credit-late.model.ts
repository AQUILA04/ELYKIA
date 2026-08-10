export enum LateType {
  DELAI = 'DELAI',
  ECHEANCE = 'ECHEANCE'
}

export interface CreditLateDTO {
  id: number;
  reference: string;
  clientId?: number;
  clientName: string;
  clientPhone: string;
  collector: string;
  totalAmount: number;
  totalAmountPaid: number;
  /** Montant restant net du reliquat client (à encaisser). */
  totalAmountRemaining: number;
  /** Reliquat imputé sur ce crédit pour le calcul du restant net. */
  clientReliquatApplied?: number;
  dailyStake: number;
  beginDate: string;
  expectedEndDate: string;
  remainingDaysCount: number;
  lateDaysDelai: number;
  lateDaysEcheance: number;
  lateType: LateType;
  status: string;
  clientQuarter: string;
  selected?: boolean;
}

export interface CreditLateSummaryDTO {
  totalLate: number;
  totalDelai: number;
  totalEcheance: number;
  totalAmountRemaining: number;
  totalAmountRemainingDelai: number;
}
