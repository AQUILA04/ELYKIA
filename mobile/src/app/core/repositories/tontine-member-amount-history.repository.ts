import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';

export interface TontineMemberAmountHistory {
    id: string;
    tontineMemberId: string;
    amount: number;
    startDate: string;
    endDate?: string;
    creationDate: string;
    isSync: boolean;
    syncDate?: string;
    syncHash?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TontineMemberAmountHistoryRepository extends BaseRepository<TontineMemberAmountHistory, string> {
    protected tableName = 'tontine_member_amount_history';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: TontineMemberAmountHistory[]): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        if (!entities.length) return;

        const query = `
      INSERT OR REPLACE INTO tontine_member_amount_history (
        id, tontineMemberId, amount, startDate, endDate, creationDate, isSync, syncDate, syncHash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const set: capSQLiteSet[] = entities.map(h => ({
            statement: query,
            values: [
                h.id, h.tontineMemberId, h.amount, h.startDate, h.endDate || null, h.creationDate,
                h.isSync ? 1 : 0, h.syncDate || new Date().toISOString(), h.syncHash
            ]
        }));

        await this.databaseService.executeSet(set);
    }

    async getByMemberId(memberId: string): Promise<TontineMemberAmountHistory[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const query = `SELECT * FROM ${this.tableName} WHERE tontineMemberId = ? ORDER BY startDate DESC`;
        const result = await this.databaseService.query(query, [memberId]);
        return (result.values || []).map((row: any) => ({
            ...row,
            isSync: row.isSync === 1
        }));
    }
}
