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

            // INSERT OR REPLACE pour mettre à jour ou insérer la localité
            // On ne compare plus les hashs, on écrase systématiquement avec les données du serveur
            const sql = `INSERT OR REPLACE INTO localities (
                id, name, region, isActive, isLocal, isSync, syncDate, createdAt, syncHash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const params = [
                localityIdStr,
                locality.name,
                locality.region ?? 'Maritime',
                locality.isActive !== undefined ? (locality.isActive ? 1 : 0) : 1,
                locality.isLocal ? 1 : 0,
                locality.isSync ? 1 : 0,
                now,
                locality.createdAt ?? now,
                null // Plus de hash
            ];

            sqlSet.push({ statement: sql, values: params });
        }

        try {
            if (sqlSet.length > 0) {
                await this.databaseService.executeSet(sqlSet);
                console.log(`Successfully saved ${entities.length} localities (INSERT OR REPLACE).`);
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
