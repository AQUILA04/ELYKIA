import { Injectable } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { DailyConsentHistoryRecord } from '../models/daily-consent-history.model';

@Injectable({ providedIn: 'root' })
export class DailyConsentHistoryRepository {

  constructor(private readonly databaseService: DatabaseService) {}

  async insert(record: DailyConsentHistoryRecord): Promise<void> {
    if (!this.databaseService['db']) return;

    const sql = `
      INSERT INTO daily_consent_history (
        id, commercialUsername, actionDate, consentedAt,
        challengeCode, challengeEntered, consentMessageVersion
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.databaseService.execute(sql, [
      record.id,
      record.commercialUsername,
      record.actionDate,
      record.consentedAt,
      record.challengeCode,
      record.challengeEntered,
      record.consentMessageVersion
    ]);
  }

  async findByCommercialUsername(commercialUsername: string): Promise<DailyConsentHistoryRecord[]> {
    if (!this.databaseService['db']) return [];

    const sql = `
      SELECT *
      FROM daily_consent_history
      WHERE commercialUsername = ?
      ORDER BY consentedAt DESC
    `;
    const result = await this.databaseService.query(sql, [commercialUsername]);
    return (result.values || []) as DailyConsentHistoryRecord[];
  }
}
