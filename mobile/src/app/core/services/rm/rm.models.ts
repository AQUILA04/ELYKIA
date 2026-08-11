export type FieldDayPlanStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export interface FieldDayPlan {
  id: number;
  recoveryManagerUsername: string;
  planDate: string;
  status: FieldDayPlanStatus;
  commercialUsernames: string[];
  quarters: string[];
}

export interface FieldDayPlanRequest {
  planDate: string;
  commercialUsernames: string[];
  quarters?: string[];
}

export interface RmCollectorStat {
  username: string;
  lateCount: number;
  totalAmountRemaining: number;
  quarters: string[];
}

export interface RmOfflinePackStats {
  lateCredits: number;
  clients: number;
  estimatedBytes: number;
}

export interface RmCommercialRef {
  username: string;
  displayName: string;
}

export interface RmPackClient {
  id: number;
  firstname?: string;
  lastname?: string;
  fullName?: string;
  phone?: string;
  quarter?: string;
  collector?: string;
  latitude?: number;
  longitude?: number;
  mll?: string;
}

export interface RmCreditLate {
  id: number;
  reference?: string;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  clientQuarter?: string;
  collector?: string;
  totalAmount?: number;
  totalAmountPaid?: number;
  totalAmountRemaining?: number;
  clientReliquatApplied?: number;
  dailyStake?: number;
  beginDate?: string;
  expectedEndDate?: string;
  remainingDaysCount?: number;
  lateDaysDelai?: number;
  lateDaysEcheance?: number;
  lateType?: string;
  status?: string;
}

export interface RmOfflinePack {
  planId: number;
  planDate: string;
  generatedAt: string;
  stats: RmOfflinePackStats;
  commercials: RmCommercialRef[];
  lateCredits: RmCreditLate[];
  clients: RmPackClient[];
  creditFieldControlsToday: unknown[];
  tontineMembers: unknown[];
  tontineFieldControlsToday: unknown[];
}
