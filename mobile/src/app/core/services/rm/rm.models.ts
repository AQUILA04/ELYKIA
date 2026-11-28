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
  tontineMemberCount?: number;
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
  tontineCollector?: string;
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
  /** Mise journalière en vigueur pour ce mois. Absente des packs téléchargés avant ce champ. */
  dailyAmount?: number;
}

export interface RmPackTontineCollector {
  commercialUsername: string;
  currentCollector?: boolean;
  totalAmount?: number;
  months: RmPackTontineMonth[];
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
  /** Part société en place (calculée ou réajustée). Absente des anciens packs. */
  societyShare?: number;
  /** AUTO, CONFIRMED (validée) ou ADJUSTED (corrigée). */
  societyShareStatus?: 'AUTO' | 'CONFIRMED' | 'ADJUSTED';
  /** Déjà validée ou corrigée par un chef de recouvrement. */
  societyShareLocked?: boolean;
  /** Part calculée par le système (packs récents). */
  societyShareComputed?: number;
  /** Solde disponible en place (packs récents). */
  availableContribution?: number;
  /** Total cotisé hors collectes de livraison (packs récents). */
  regularContribution?: number;
  /** MANDATORY, OPTIONAL ou DISABLED : absent des anciens packs (réajustement alors proposé). */
  societyShareAdjustmentMode?: 'MANDATORY' | 'OPTIONAL' | 'DISABLED';
  /** Totaux mensuels agrégés (rétrocompat packs déjà téléchargés). */
  months: RmPackTontineMonth[];
  /** Répartition système par commercial collecteur (packs récents). */
  collectors?: RmPackTontineCollector[];
  /** Dernier contrôle (liste en ligne). */
  latestControlStatus?: string;
  latestDifferenceAmount?: number;
  latestObservedAt?: string;
  ecartDecisionStatus?: string | null;
  modifiable?: boolean;
}

export interface RmCreditLate {
  id: number;
  reference?: string;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  clientQuarter?: string;
  latitude?: number;
  longitude?: number;
  mll?: string;
  collector?: string;
  totalAmount?: number;
  totalAmountPaid?: number;
  totalAmountRemaining?: number;
  clientReliquatApplied?: number;
  dailyStake?: number;
  /** Avance déjà enregistrée sur le crédit. */
  advance?: number;
  beginDate?: string;
  expectedEndDate?: string;
  remainingDaysCount?: number;
  lateDaysDelai?: number;
  lateDaysEcheance?: number;
  lateType?: string;
  status?: string;
  carnetVerified?: boolean;
  carnetVerifiedAt?: string;
  carnetVerifiedBy?: string;
  /** Dernier contrôle, renseigné sur la liste des crédits en cours. */
  latestControlStatus?: string;
  latestDifferenceAmount?: number;
  latestNotebookTotalAmount?: number;
  latestControlNote?: string;
  latestObservedAt?: string;
  ecartDecisionStatus?: string | null;
  modifiable?: boolean;
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
  ecartDecisionStatus?: string | null;
  modifiable?: boolean;
  lines?: {
    year: number;
    month: number;
    commercialUsername?: string;
    notebookAmount: number;
    systemAmount: number;
    differenceAmount: number;
    declaredDailyAmount?: number | null;
  }[];
  collectors?: {
    commercialUsername: string;
    notebookTotalAmount?: number;
    systemTotalAmount?: number;
    differenceAmount?: number;
    status?: string;
  }[];
}

export interface RmOfflinePack {
  planId: number;
  planDate: string;
  generatedAt: string;
  stats: RmOfflinePackStats;
  commercials: RmCommercialRef[];
  /** Commerciaux actifs, pour attribuer un mois de carnet encore vide. Absent des packs anciens. */
  promoters?: RmCommercialRef[];
  lateCredits: RmCreditLate[];
  /** Crédits en cours du plan. Absent des packs téléchargés avant cette liste. */
  inProgressCredits?: RmCreditLate[];
  clients: RmPackClient[];
  creditFieldControlsToday: unknown[];
  tontineMembers: RmPackTontineMember[];
  tontineFieldControlsToday: RmPackTontineFieldControlToday[];
  /**
   * Réglage d'agence copié dans le pack : un contrôle de carnet tontine
   * marque le membre comme vérifié lorsque la valeur est vraie.
   */
  tontineAutoVerifyOnFieldControl?: boolean;
}

/** Taux de recouvrement mensuel chef (retards délai app, stock live). */
export interface MonthlyRecoveryRate {
  year: number;
  month: number;
  amountCollectedByChef: number;
  latePortfolioDue: number;
  lateCreditsCount: number;
  operationsCount: number;
  recoveryRatePercent: number;
}
