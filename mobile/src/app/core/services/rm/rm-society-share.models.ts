/** Part société d'un membre tontine validée ou corrigée par le chef de recouvrement (file hors ligne). */
export interface RmSocietyShareOp {
  localId: string;
  /** Référence d'idempotence envoyée au serveur (rejeu de synchronisation). */
  reference: string;
  tontineMemberId: number;
  clientName?: string;
  declaredSocietyShare: number;
  comment?: string | null;
  createdAt: string;
  isSync: boolean;
  lastError: string | null;
  syncErrorId?: string | null;
}

/** Réponse du serveur (champs utiles à l'écran du chef de recouvrement). */
export interface RmSocietyShareResult {
  outcome: 'ADJUSTED' | 'VALIDATED' | 'REJECTED' | 'RESET';
  message?: string;
  memberSocietyShare?: number;
  memberAvailableContribution?: number;
  memberSocietyShareStatus?: 'AUTO' | 'CONFIRMED' | 'ADJUSTED';
  memberSocietyShareLocked?: boolean;
}
