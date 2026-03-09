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

        const sqlSet: capSQLiteSet[] = [];
        const now = new Date().toISOString();

        for (const recovery of entities) {
            if (!recovery || recovery.id === undefined) {
                continue;
            }
            const recoveryIdStr = String(recovery.id);

            // INSERT OR REPLACE pour mettre à jour ou insérer le recouvrement
            // On ne compare plus les hashs, on écrase systématiquement avec les données du serveur
            const sql = `INSERT OR REPLACE INTO recoveries (
                id, amount, paymentDate, paymentMethod, notes, distributionId, clientId,
                commercialId, isLocal, isSync, syncDate, syncHash, isDefaultStake, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const params = [
                recoveryIdStr,
                recovery.amount ?? 0,
                recovery.paymentDate ?? null,
                recovery.paymentMethod ?? null,
                recovery.notes ?? null,
                recovery.distribution?.id ?? recovery.distributionId ?? null,
                recovery.client?.id ?? recovery.clientId ?? null,
                recovery.commercialId ?? null,
                recovery.isLocal ? 1 : 0,
                recovery.isSync ? 1 : 0,
                now,
                null, // Plus de hash
                recovery.isDefaultStake ? 1 : 0,
                recovery.createdAt ?? now
            ];

            sqlSet.push({ statement: sql, values: params });
        }

        try {
            if (sqlSet.length > 0) {
                await this.databaseService.executeSet(sqlSet);
                console.log(`Successfully saved ${entities.length} recoveries (INSERT OR REPLACE).`);
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

    /**
     * Delete recoveries by distribution IDs
     * @param distributionIds List of distribution IDs
     */
    async deleteByDistributionIds(distributionIds: string[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        if (distributionIds.length === 0) return;

        const placeholders = distributionIds.map(() => '?').join(',');
        const sql = `DELETE FROM recoveries WHERE distributionId IN (${placeholders})`;
        await this.databaseService.execute(sql, distributionIds);
    }

    /**
     * Count recoveries for a specific client on a specific date
     * @param clientId Client ID
     * @param date Date string (YYYY-MM-DD)
     * @returns Number of recoveries
     */
    async countByClientAndDate(clientId: string, date: string): Promise<number> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        // We use paymentDate for the check as it represents the date of the recovery
        const sql = `SELECT COUNT(*) as total FROM recoveries WHERE clientId = ? AND paymentDate LIKE ?`;
        const result = await this.databaseService.query(sql, [clientId, `${date}%`]);
        return result.values?.[0]?.total || 0;
    }

}
