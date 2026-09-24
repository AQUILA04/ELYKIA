import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Locality } from '../../models/locality.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class LocalityRepository extends BaseRepository<Locality, string> {
    protected tableName = 'localities';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Locality[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const sqlSet: capSQLiteSet[] = [];
        const now = new Date().toISOString();

        for (const locality of entities) {
            if (!locality || locality.id === undefined || locality.id === null) {
                continue;
            }
            const localityIdStr = String(locality.id);

            // Skip / merge if a local UUID (or mapping) already represents the same normalized name
            const conflict = await this.findLocalConflictForIncoming(locality);
            if (conflict && String(conflict.id) !== localityIdStr) {
                await this.mergeLocalRowIntoServerId(String(conflict.id), localityIdStr);
            }

            const sql = `INSERT INTO localities (
                id, name, region, isActive, isLocal, isSync, syncDate, createdAt, syncHash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                region = excluded.region,
                isActive = excluded.isActive,
                isLocal = excluded.isLocal,
                isSync = excluded.isSync,
                syncDate = excluded.syncDate,
                syncHash = excluded.syncHash`;

            const params = [
                localityIdStr,
                locality.name,
                locality.region ?? 'Maritime',
                locality.isActive !== undefined ? (locality.isActive ? 1 : 0) : 1,
                locality.isLocal ? 1 : 0,
                locality.isSync ? 1 : 0,
                now,
                locality.createdAt ?? now,
                null
            ];

            sqlSet.push({ statement: sql, values: params });
        }

        try {
            if (sqlSet.length > 0) {
                await this.databaseService.executeSet(sqlSet);
                console.log(`Successfully saved ${entities.length} localities (UPSERT).`);
            }
        } catch (error) {
            console.error('Failed to save localities in repository.', error);
            throw error;
        }
    }

    // ==================== SPECIFIC BUSINESS METHODS ====================

    /**
     * Add a new locality to the database
     * @param locality Locality data with at least a name
     * @returns The created locality with generated ID
     */
    async addLocality(locality: Pick<Locality, 'name'>): Promise<Locality> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const newId = this.generateUuid();
        const createdAt = new Date().toISOString();
        const sql = `INSERT INTO localities (id, name, createdAt, isLocal, isSync) VALUES (?, ?, ?, 1, 0)`;
        await this.databaseService.execute(sql, [newId, locality.name, createdAt]);
        return { id: newId, name: locality.name, createdAt: createdAt, isLocal: true, isSync: false };
    }

    /**
     * Get all localities that have not been synchronized with the server
     * @returns Array of unsynced localities
     */
    override async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<Locality[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `SELECT * FROM localities WHERE isSync = 0 AND isLocal = 1 LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [limit, offset]);
        return (result.values || []).map((row: any) => ({ ...row, isLocal: row.isLocal === 1, isSync: row.isSync === 1 }));
    }

    /**
     * Mark a locality as synchronized with the server (rewrite PK when localId !== serverId).
     */
    async markAsSynced(localId: string, serverId: string): Promise<void> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return;
        }
        const now = new Date().toISOString();
        if (localId === serverId) {
            await this.databaseService.execute(
                `UPDATE localities SET isSync = 1, isLocal = 0, syncDate = ? WHERE id = ?`,
                [now, localId]
            );
            return;
        }

        const serverExists = await this.findById(serverId);
        if (serverExists) {
            await this.mergeLocalRowIntoServerId(localId, serverId);
            return;
        }

        await this.databaseService.execute(
            `UPDATE localities SET isSync = 1, isLocal = 0, id = ?, syncDate = ? WHERE id = ?`,
            [serverId, now, localId]
        );
        await this.saveIdMapping(localId, serverId, 'locality');
        console.log(`Locality ${localId} marked as synced with server ID ${serverId}.`);
    }

    private normalizeName(name: string | null | undefined): string {
        return (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    private async findLocalConflictForIncoming(incoming: Locality): Promise<Locality | null> {
        const serverId = String(incoming.id);
        const mapped = await this.databaseService.query(
            `SELECT localId FROM id_mappings WHERE serverId = ? AND entityType = 'locality' LIMIT 1`,
            [serverId]
        );
        if (mapped.values?.length) {
            const localId = String(mapped.values[0].localId);
            if (localId !== serverId) {
                const row = await this.findById(localId);
                if (row) {
                    return { ...row, isLocal: (row as any).isLocal === 1 || (row as any).isLocal === true, isSync: (row as any).isSync === 1 || (row as any).isSync === true };
                }
            }
        }

        const normalized = this.normalizeName(incoming.name);
        if (!normalized) {
            return null;
        }

        const result = await this.databaseService.query(`SELECT * FROM localities WHERE id != ?`, [serverId]);
        for (const row of result.values || []) {
            if (this.normalizeName(row.name) === normalized) {
                return {
                    ...row,
                    isLocal: row.isLocal === 1,
                    isSync: row.isSync === 1
                };
            }
        }
        return null;
    }

    private async mergeLocalRowIntoServerId(localId: string, serverId: string): Promise<void> {
        if (localId === serverId) {
            await this.markAsSynced(localId, serverId);
            return;
        }
        const serverExists = await this.findById(serverId);
        if (!serverExists) {
            await this.databaseService.execute(
                `UPDATE localities SET isSync = 1, isLocal = 0, id = ?, syncDate = ? WHERE id = ?`,
                [serverId, new Date().toISOString(), localId]
            );
            await this.saveIdMapping(localId, serverId, 'locality');
            return;
        }
        await this.databaseService.execute(`DELETE FROM localities WHERE id = ?`, [localId]);
        await this.saveIdMapping(localId, serverId, 'locality');
    }
}
