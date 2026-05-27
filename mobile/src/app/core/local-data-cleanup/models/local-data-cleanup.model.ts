import { LocalDataCleanupTriggerAction } from './local-data-cleanup-history.model';

/** Nombre de jours conservés pour revue manuelle dans le modal (hors jour courant). */
export const LOCAL_DATA_CLEANUP_RETENTION_DAYS = 7;

/** Contexte de dates pour purge automatique et modal. */
export interface LocalDataCleanupDateContext {
  /** Date du jour (YYYY-MM-DD) — exclue du modal. */
  todayDate: string;
  /**
   * Borne basse de rétention (YYYY-MM-DD) : inclus pour le modal,
   * exclus pour la purge (données plus anciennes sont supprimées).
   */
  retentionStartDate: string;
}

/**
 * Types de données locales nettoyables (extensible).
 * Ajouter un handler + entrée ici pour chaque nouvelle entité.
 */
export enum LocalDataCleanupEntityType {
  Distribution = 'distribution',
  Recovery = 'recovery',
  TontineMember = 'tontine-member',
  TontineCollection = 'tontine-collection',
  TontineDelivery = 'tontine-delivery',
}

/** Élément affiché dans le modal de nettoyage. */
export interface LocalDataCleanupItem {
  id: string;
  entityType: LocalDataCleanupEntityType;
  title: string;
  subtitle?: string;
  amount?: number;
  date: string;
}

/** Section du modal (une par type d'entité). */
export interface LocalDataCleanupSection {
  entityType: LocalDataCleanupEntityType;
  title: string;
  items: LocalDataCleanupItem[];
}

/** Sélection par type d'entité → identifiants à supprimer. */
export type LocalDataCleanupSelection = Partial<Record<LocalDataCleanupEntityType, string[]>>;

export interface LocalDataCleanupDeleteResult {
  deletedByType: Partial<Record<LocalDataCleanupEntityType, number>>;
  totalDeleted: number;
  historyBatchId?: string;
}

/** Options pour une suppression depuis le modal de nettoyage journalier. */
export interface LocalDataCleanupDeleteOptions {
  /** Métadonnées des éléments supprimés (pour l'historique). */
  auditItems: LocalDataCleanupItem[];
  triggerAction: LocalDataCleanupTriggerAction;
}
