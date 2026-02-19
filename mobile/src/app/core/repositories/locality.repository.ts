import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Locality } from '../../models/locality.model';
import { DatabaseService } from '../services/database.service';

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

        const keysToInclude = ['id', 'name'];
        const existingRows = await this.databaseService.query('SELECT id, syncHash FROM localities');
        const existingLocalityMap = new Map<string, string>(
            existingRows.values?.map((row: { id: string; syncHash: string }) => [row.id, row.syncHash]) ?? []
        );

        const localitiesToInsert: any[][] = [];
        const localitiesToUpdate: any[][] = [];

        for (const locality of entities) {
            if (!locality || locality.id === undefined || locality.id === null) {
                continue;
            }
            const newHash = this.generateHash(locality, keysToInclude);
            const isExisting = existingLocalityMap.has(locality.id);
            const needsUpdate = isExisting && existingLocalityMap.get(locality.id) !== newHash;

            const REGION = 'Maritime';
            const IS_ACTIVE = 1;

            if (needsUpdate) {
                const updateParams = [
                    locality.name,
                    REGION,
                    IS_ACTIVE,
                    newHash,
                    locality.id
                ];
                localitiesToUpdate.push(updateParams);
            } else if (!isExisting) {
                const insertParams = [
                    locality.id,
                    locality.name,
                    REGION,
                    IS_ACTIVE,
                    newHash,
                    locality.isLocal ? 1 : 0,
                    locality.isSync ? 1 : 0,
                    new Date().toISOString(),
                    locality.createdAt ?? new Date().toISOString()
                ];
                localitiesToInsert.push(insertParams);
            }
        }

        try {
            if (localitiesToUpdate.length > 0) {
                const sql = `UPDATE localities SET name = ?, region = ?, isActive = ?, syncHash = ? WHERE id = ?`;
                await this.databaseService['db'].run(sql, localitiesToUpdate); // Using run for batch if supported or need loop? DBService uses run with array of arrays for batch in some plugins but here it seems it might be loop or specific plugin feature.
                // Wait, DatabaseService.saveLocalities uses this.db.run(sql, localitiesToUpdate) for update?
                // Let's check DatabaseService.saveLocalities implementation again.
                // Line 685: await this.db.run(sql, localitiesToUpdate);
                // If the plugin supports it, great. If not, I should stick to what DatabaseService does.
                // It seems DatabaseService uses `run` with array of arrays for batch updates in `saveLocalities`.
                // I will assume it works as per existing code.
            }

            if (localitiesToInsert.length > 0) {
                const sql = `INSERT INTO localities (id, name, region, isActive, syncHash, isLocal, isSync, syncDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                for (const params of localitiesToInsert) {
                    await this.databaseService.execute(sql, params);
                }
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
     * Mark a locality as synchronized with the server
     * @param localId Local ID of the locality
     * @param serverId Server ID assigned to the locality
     */
    async markAsSynced(localId: string, serverId: string): Promise<void> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return;
        }
        const now = new Date().toISOString();
        const updateSql = `UPDATE localities SET isSync = 1, isLocal = 0, syncDate = ? WHERE id = ?`;
        await this.databaseService.execute(updateSql, [now, localId]);

        const mappingSql = `INSERT INTO id_mappings (localId, serverId, entityType) VALUES (?, ?, 'locality')`;
        await this.databaseService.execute(mappingSql, [localId, serverId.toString()]);

        console.log(`Locality ${localId} marked as synced with server ID ${serverId}.`);
    }
}
