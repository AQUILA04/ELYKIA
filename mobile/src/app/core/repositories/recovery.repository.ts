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
     * Mark a recovery as synchronized with the server
     * @param recoveryId ID of the recovery to mark as synced
     */
    async markAsSynced(recoveryId: string): Promise<void> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return;
        }
        const now = new Date().toISOString();
        const sql = `UPDATE recoveries SET isSync = 1, isLocal = 0, syncDate = ? WHERE id = ?`;
        await this.databaseService.execute(sql, [now, recoveryId]);
        console.log(`Recovery ${recoveryId} marked as synced.`);
    }

}
