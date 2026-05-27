import { LocalDataCleanupEntityType } from './local-data-cleanup.model';

/** Origine de l'action enregistrée dans l'historique journalier. */
export enum LocalDataCleanupTriggerAction {
  DeleteSelected = 'delete_selected',
  DeleteAll = 'delete_all',
  /** Suppression automatique des données locales de plus de 7 jours. */
  AutoPurgeRetention = 'auto_purge_retention'
}

/** Ligne d'historique persistée en base (une par entité supprimée). */
export interface LocalDataCleanupHistoryRecord {
  id: string;
  batchId: string;
  commercialUsername: string;
  /** Date calendaire du nettoyage (YYYY-MM-DD). */
  actionDate: string;
  /** Horodatage ISO de l'opération. */
  performedAt: string;
  entityType: LocalDataCleanupEntityType;
  entityId: string;
  entityLabel: string;
  entitySubtitle?: string;
  amount?: number;
  entityCreatedAt?: string;
  triggerAction: LocalDataCleanupTriggerAction;
}
