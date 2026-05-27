import {
  LocalDataCleanupDateContext,
  LocalDataCleanupEntityType,
  LocalDataCleanupItem
} from '../models/local-data-cleanup.model';

/**
 * Contrat Strategy : chaque type de donnée locale implémente ce handler.
 */
export interface LocalDataCleanupHandler {
  readonly entityType: LocalDataCleanupEntityType;
  readonly sectionTitle: string;

  /**
   * Données locales dans la fenêtre de rétention (>= retentionStartDate, < todayDate).
   */
  findStaleItems(commercialUsername: string, context: LocalDataCleanupDateContext): Promise<LocalDataCleanupItem[]>;

  /**
   * Données locales plus anciennes que la fenêtre de rétention (< retentionStartDate).
   * Les supprime et retourne les métadonnées pour l'historique.
   */
  purgeExpiredItems(commercialUsername: string, context: LocalDataCleanupDateContext): Promise<LocalDataCleanupItem[]>;

  deleteItems(ids: string[], commercialUsername: string): Promise<void>;
}
