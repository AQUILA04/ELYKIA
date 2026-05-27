import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { InitializationValidationService } from '../services/initialization-validation.service';
import { LocalDataCleanupRegistryService } from './local-data-cleanup-registry.service';
import {
  LOCAL_DATA_CLEANUP_RETENTION_DAYS,
  LocalDataCleanupDateContext,
  LocalDataCleanupDeleteOptions,
  LocalDataCleanupDeleteResult,
  LocalDataCleanupEntityType,
  LocalDataCleanupItem,
  LocalDataCleanupSection,
  LocalDataCleanupSelection
} from './models/local-data-cleanup.model';
import { LocalDataCleanupHistoryService } from './local-data-cleanup-history.service';
import { LocalDataCleanupTriggerAction } from './models/local-data-cleanup-history.model';
import { LoggerService } from '../services/logger.service';

@Injectable({ providedIn: 'root' })
export class LocalDataCleanupService {
  private readonly storageKeyPrefix = 'local_data_cleanup_handled_';

  constructor(
    private readonly storage: Storage,
    private readonly initValidationService: InitializationValidationService,
    private readonly registry: LocalDataCleanupRegistryService,
    private readonly historyService: LocalDataCleanupHistoryService,
    private readonly log: LoggerService
  ) {}

  getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  buildDateContext(todayDate: string = this.getTodayDateString()): LocalDataCleanupDateContext {
    return {
      todayDate,
      retentionStartDate: this.computeRetentionStartDate(todayDate)
    };
  }

  /**
   * Supprime automatiquement les données locales de plus de {@link LOCAL_DATA_CLEANUP_RETENTION_DAYS} jours.
   */
  async purgeExpiredLocalData(commercialUsername: string): Promise<number> {
    const context = this.buildDateContext();
    const purgedItems: LocalDataCleanupItem[] = [];

    for (const handler of this.registry.getHandlers()) {
      const items = await handler.purgeExpiredItems(commercialUsername, context);
      purgedItems.push(...items);
    }

    if (purgedItems.length > 0) {
      await this.historyService.recordDeletions(
        commercialUsername,
        purgedItems,
        LocalDataCleanupTriggerAction.AutoPurgeRetention,
        context.todayDate
      );
      this.log.log(
        `[LocalDataCleanup] Auto-purged ${purgedItems.length} item(s) older than ` +
        `${LOCAL_DATA_CLEANUP_RETENTION_DAYS} days for ${commercialUsername}`
      );
    }

    return purgedItems.length;
  }

  /**
   * Afficher le modal si : première visite dashboard du jour après init du jour,
   * et l'utilisateur n'a pas encore conservé / supprimé via le prompt.
   */
  async shouldPromptUser(commercialUsername: string): Promise<boolean> {
    const initCompleteToday = await this.initValidationService.isInitializationCompleteForToday();
    if (!initCompleteToday) {
      return false;
    }

    const handledDate = await this.getHandledDate(commercialUsername);
    return handledDate !== this.getTodayDateString();
  }

  async loadSections(commercialUsername: string): Promise<LocalDataCleanupSection[]> {
    const context = this.buildDateContext();
    const sections: LocalDataCleanupSection[] = [];

    for (const handler of this.registry.getHandlers()) {
      const items = await handler.findStaleItems(commercialUsername, context);
      if (items.length > 0) {
        sections.push({
          entityType: handler.entityType,
          title: handler.sectionTitle,
          items
        });
      }
    }

    return sections;
  }

  async hasStaleLocalData(commercialUsername: string): Promise<boolean> {
    const sections = await this.loadSections(commercialUsername);
    return sections.some(section => section.items.length > 0);
  }

  async deleteSelection(
    commercialUsername: string,
    selection: LocalDataCleanupSelection,
    options: LocalDataCleanupDeleteOptions
  ): Promise<LocalDataCleanupDeleteResult> {
    const deletedByType: Partial<Record<LocalDataCleanupEntityType, number>> = {};
    let totalDeleted = 0;

    for (const [entityType, ids] of Object.entries(selection) as [LocalDataCleanupEntityType, string[]][]) {
      if (!ids?.length) {
        continue;
      }
      const handler = this.registry.getHandler(entityType);
      if (!handler) {
        continue;
      }
      await handler.deleteItems(ids, commercialUsername);
      deletedByType[entityType] = ids.length;
      totalDeleted += ids.length;
    }

    let historyBatchId: string | undefined;
    if (totalDeleted > 0 && options.auditItems.length > 0) {
      const batchId = await this.historyService.recordDeletions(
        commercialUsername,
        options.auditItems,
        options.triggerAction,
        this.getTodayDateString()
      );
      historyBatchId = batchId ?? undefined;
    }

    return { deletedByType, totalDeleted, historyBatchId };
  }

  /** Retourne les métadonnées des éléments sélectionnés (pour l'historique). */
  collectAuditItems(sections: LocalDataCleanupSection[], selectedIds: Set<string>): LocalDataCleanupItem[] {
    const items: LocalDataCleanupItem[] = [];
    for (const section of sections) {
      for (const item of section.items) {
        if (selectedIds.has(item.id)) {
          items.push(item);
        }
      }
    }
    return items;
  }

  buildSelectionFromSections(
    sections: LocalDataCleanupSection[],
    selectedIds: Set<string>
  ): LocalDataCleanupSelection {
    const selection: LocalDataCleanupSelection = {};

    for (const section of sections) {
      const ids = section.items
        .map(item => item.id)
        .filter(id => selectedIds.has(id));

      if (ids.length > 0) {
        selection[section.entityType] = ids;
      }
    }

    return selection;
  }

  async markPromptHandledForToday(commercialUsername: string): Promise<void> {
    await this.storage.set(this.storageKey(commercialUsername), this.getTodayDateString());
  }

  private storageKey(commercialUsername: string): string {
    return `${this.storageKeyPrefix}${commercialUsername}`;
  }

  private async getHandledDate(commercialUsername: string): Promise<string | null> {
    return (await this.storage.get(this.storageKey(commercialUsername))) ?? null;
  }

  private computeRetentionStartDate(todayDate: string): string {
    const anchor = new Date(`${todayDate}T12:00:00`);
    anchor.setDate(anchor.getDate() - LOCAL_DATA_CLEANUP_RETENTION_DAYS);
    return anchor.toISOString().split('T')[0];
  }
}
