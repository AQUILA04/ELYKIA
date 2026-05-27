import { Injectable } from '@angular/core';
import { capSQLiteSet } from '@capacitor-community/sqlite';
import { DatabaseService } from '../../services/database.service';
import { LocalDataCleanupHistoryRecord } from '../models/local-data-cleanup-history.model';

@Injectable({ providedIn: 'root' })
export class LocalDataCleanupHistoryRepository {

  constructor(private readonly databaseService: DatabaseService) {}

  async insertAll(records: LocalDataCleanupHistoryRecord[]): Promise<void> {
    if (!this.databaseService['db'] || records.length === 0) {
      return;
    }

    const sql = `
      INSERT INTO local_data_cleanup_history (
        id, batchId, commercialUsername, actionDate, performedAt,
        entityType, entityId, entityLabel, entitySubtitle, amount,
        entityCreatedAt, triggerAction
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const batch: capSQLiteSet[] = records.map(record => ({
      statement: sql,
      values: [
        record.id,
        record.batchId,
        record.commercialUsername,
        record.actionDate,
        record.performedAt,
        record.entityType,
        record.entityId,
        record.entityLabel,
        record.entitySubtitle ?? null,
        record.amount ?? null,
        record.entityCreatedAt ?? null,
        record.triggerAction
      ]
    }));

    await this.databaseService.executeSet(batch);
  }

  async findByCommercialAndActionDate(
    commercialUsername: string,
    actionDate: string
  ): Promise<LocalDataCleanupHistoryRecord[]> {
    if (!this.databaseService['db']) {
      return [];
    }

    const sql = `
      SELECT * FROM local_data_cleanup_history
      WHERE commercialUsername = ? AND actionDate = ?
      ORDER BY performedAt DESC, entityLabel ASC
    `;
    const result = await this.databaseService.query(sql, [commercialUsername, actionDate]);
    return (result.values || []) as LocalDataCleanupHistoryRecord[];
  }

  async countByCommercialAndActionDate(
    commercialUsername: string,
    actionDate: string
  ): Promise<number> {
    if (!this.databaseService['db']) {
      return 0;
    }

    const sql = `
      SELECT COUNT(*) as total FROM local_data_cleanup_history
      WHERE commercialUsername = ? AND actionDate = ?
    `;
    const result = await this.databaseService.query(sql, [commercialUsername, actionDate]);
    return result.values?.[0]?.total ?? 0;
  }
}
