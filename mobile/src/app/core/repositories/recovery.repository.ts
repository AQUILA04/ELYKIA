import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Recovery } from '../../models/recovery.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class RecoveryRepository extends BaseRepository<Recovery, string> {
    protected tableName = 'recoveries';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Recovery[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = ['id', 'amount', 'paymentDate', 'paymentMethod', 'notes', 'distributionId', 'clientId', 'commercialId'];
        const existingRows = await this.databaseService.query('SELECT id, syncHash FROM recoveries');
        const existingRecoveryMap = new Map<string, string>(
            existingRows.values?.map((row: { id: string | number; syncHash: string }) => [String(row.id), row.syncHash]) ?? []
        );

        const recoveriesToInsert: capSQLiteSet[] = [];
        const recoveriesToUpdate: capSQLiteSet[] = [];
        const now = new Date().toISOString();

        for (const recovery of entities) {
            if (!recovery || recovery.id === undefined) {
                continue;
            }
            const recoveryIdStr = String(recovery.id);

            const normalizedRecovery = {
                ...recovery,
                distributionId: recovery.distribution?.id,
                clientId: recovery.client?.id,
                commercialId: recovery.commercialId
            };
            const newHash = this.generateHash(normalizedRecovery, keysToInclude);

            const isExisting = existingRecoveryMap.has(recoveryIdStr);
            const needsUpdate = isExisting && existingRecoveryMap.get(recoveryIdStr) !== newHash;

            const IS_LOCAL = 0;
            const IS_SYNC = 1;

            if (needsUpdate) {
                const sql = `UPDATE recoveries SET amount = ?, paymentDate = ?, paymentMethod = ?, notes = ?, distributionId = ?, clientId = ?, commercialId = ?, isLocal = ?, isSync = ?, syncDate = ?, syncHash = ?, isDefaultStake = ? WHERE id = ?`;
                const updateParams = [
                    recovery.amount ?? 0,
                    recovery.paymentDate ?? null,
                    recovery.paymentMethod ?? null,
                    recovery.notes ?? null,
                    recovery.distribution?.id ?? null,
                    recovery.client?.id ?? null,
                    recovery.commercialId ?? null,
                    IS_LOCAL,
                    IS_SYNC,
                    now,
                    newHash,
                    recovery.isDefaultStake ? 1 : 0,
                    recoveryIdStr
                ];
                recoveriesToUpdate.push({ statement: sql, values: updateParams });

            } else if (!isExisting) {
                const sql = `INSERT INTO recoveries (id, amount, paymentDate, paymentMethod, notes, distributionId, clientId, commercialId, isLocal, isSync, syncDate, syncHash, isDefaultStake, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                const insertParams = [
                    recoveryIdStr,
                    recovery.amount ?? 0,
                    recovery.paymentDate ?? null,
                    recovery.paymentMethod ?? null,
                    recovery.notes ?? null,
                    recovery.distribution?.id ?? null,
                    recovery.client?.id ?? null,
                    recovery.commercialId ?? null,
                    IS_LOCAL,
                    IS_SYNC,
                    now,
                    newHash,
                    recovery.isDefaultStake ? 1 : 0,
                    recovery.createdAt ?? now
                ];
                recoveriesToInsert.push({ statement: sql, values: insertParams });
            }
        }

        try {
            if (recoveriesToUpdate.length > 0) {
                await this.databaseService.executeSet(recoveriesToUpdate);
            }

            if (recoveriesToInsert.length > 0) {
                await this.databaseService.executeSet(recoveriesToInsert);
            }
        } catch (error) {
            console.error('Failed to save recoveries in repository.', error);
            throw error;
        }
    }

    /**
     * Get unsynced recoveries with pagination
     * @param commercialUsername Commercial username
     * @param limit Max number of items
     * @param offset Offset
     */
    override async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<Recovery[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `SELECT * FROM recoveries WHERE isSync = 0 AND isLocal = 1 AND commercialId = ? ORDER BY createdAt ASC LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [commercialUsername, limit, offset]);
        return (result.values || []).map((row: any) => this.mapRowToRecovery(row));
    }

    async markAsSynced(localId: string): Promise<void> {
        if (!this.databaseService['db']) return;
        await this.databaseService.execute(
            `UPDATE recoveries SET isSync = 1, isLocal = 0, syncDate = datetime('now') WHERE id = ?`,
            [localId]
        );
    }

    private mapRowToRecovery(row: any): Recovery {
        return {
            ...row,
            isLocal: row.isLocal === 1,
            isSync: row.isSync === 1,
            isDefaultStake: row.isDefaultStake === 1
        } as Recovery;
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get all recoveries that have not been synchronized with the server
     * @returns Array of unsynced recoveries
     */
    async getUnsynced(): Promise<Recovery[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        const sql = `SELECT * FROM recoveries WHERE isSync = 0 AND isLocal = 1`;
        const ret = await this.databaseService.query(sql);
        return ret.values || [];
    }

    /**
     * Get recoveries created on a specific date for a commercial
     * @param commercialUsername Commercial username
     * @param date Date string (YYYY-MM-DD)
     * @returns Array of recoveries with client names
     */
    async findByCommercialAndDate(commercialUsername: string, date: string): Promise<any[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `
            SELECT r.*, c.fullName as clientName
            FROM recoveries r
            LEFT JOIN clients c ON r.clientId = c.id
            WHERE r.commercialId = ? AND r.createdAt LIKE ?
        `;
        const result = await this.databaseService.query(sql, [commercialUsername, `${date}%`]);
        return (result.values || []).map((row: any) => ({
            ...this.mapRowToRecovery(row),
            clientName: row.clientName
        }));
    }

}
