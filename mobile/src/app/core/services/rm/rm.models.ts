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
  tontineMembers?: number;
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
  /** MinIO URL — photo profil originale. */
  profilPhotoUrl?: string;
  /** MinIO URL — thumbnail profil (listes). */
  profilPhotoThumbUrl?: string;
}

export interface RmPackTontineMonth {
  year: number;
  month: number;
  systemAmount: number;
}

export interface RmPackTontineMember {
  id: number;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  clientQuarter?: string;
  tontineCollector?: string;
  sessionYear?: number;
  amount?: number;
  totalContribution?: number;
  deliveryStatus?: string;
  carnetVerified?: boolean;
  carnetVerifiedAt?: string;
  carnetVerifiedBy?: string;
  months: RmPackTontineMonth[];
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

export interface RmPackTontineFieldControlToday {
  tontineMemberId?: number;
  reference?: string;
  status?: string;
  notebookTotalAmount?: number;
  systemTotalAmount?: number;
  differenceAmount?: number;
  note?: string;
  observedAt?: string;
  lines?: {
    year: number;
    month: number;
    notebookAmount: number;
    systemAmount: number;
    differenceAmount: number;
  }[];
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
  tontineMembers: RmPackTontineMember[];
  tontineFieldControlsToday: RmPackTontineFieldControlToday[];
}
