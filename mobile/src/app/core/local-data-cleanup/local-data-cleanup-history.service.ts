import { Injectable } from '@angular/core';
import { LoggerService } from '../services/logger.service';
import {
  LocalDataCleanupHistoryRecord,
  LocalDataCleanupTriggerAction
} from './models/local-data-cleanup-history.model';
import { LocalDataCleanupItem } from './models/local-data-cleanup.model';
import { LocalDataCleanupHistoryRepository } from './repositories/local-data-cleanup-history.repository';

@Injectable({ providedIn: 'root' })
export class LocalDataCleanupHistoryService {

  constructor(
    private readonly historyRepository: LocalDataCleanupHistoryRepository,
    private readonly log: LoggerService
  ) {}

  /**
   * Historise chaque entité supprimée lors du nettoyage journalier du dashboard.
   */
  async recordDeletions(
    commercialUsername: string,
    items: LocalDataCleanupItem[],
    triggerAction: LocalDataCleanupTriggerAction,
    actionDate: string
  ): Promise<string | null> {
    if (items.length === 0) {
      return null;
    }

    const batchId = this.generateUuid();
    const performedAt = new Date().toISOString();

    const records: LocalDataCleanupHistoryRecord[] = items.map(item => ({
      id: this.generateUuid(),
      batchId,
      commercialUsername,
      actionDate,
      performedAt,
      entityType: item.entityType,
      entityId: item.id,
      entityLabel: item.title,
      entitySubtitle: item.subtitle,
      amount: item.amount,
      entityCreatedAt: item.date,
      triggerAction
    }));

    await this.historyRepository.insertAll(records);
    this.log.log(
      `[LocalDataCleanupHistory] Recorded ${records.length} deletion(s) for ${commercialUsername} ` +
      `(batch=${batchId}, trigger=${triggerAction})`
    );

    return batchId;
  }

  async getHistoryForDay(
    commercialUsername: string,
    actionDate: string
  ): Promise<LocalDataCleanupHistoryRecord[]> {
    return this.historyRepository.findByCommercialAndActionDate(commercialUsername, actionDate);
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.trunc(Math.random() * 16);
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
