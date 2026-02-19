import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Client } from '../../models/client.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';
import { ClientMapper } from '../../shared/mapper/client.mapper';

@Injectable({
    providedIn: 'root'
})
export class ClientRepository extends BaseRepository<Client, string> {
    protected tableName = 'clients';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Client[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = ['id', 'firstname', 'lastname', 'phone', 'address', 'dateOfBirth', 'occupation', 'clientType', 'cardType', 'cardID', 'quarter', 'commercial', 'latitude', 'longitude', 'mll', 'contactPersonName', 'contactPersonPhone', 'contactPersonAddress', 'code', 'creditInProgress', 'profilPhotoUrl', 'cardPhotoUrl'];

        const existingRows = await this.databaseService.query('SELECT id, syncHash FROM clients');
        interface ClientRow {
            id: string | number;
            syncHash: string;
        }
        const existingClientMap = new Map<string, string>(
            existingRows.values?.map((row: ClientRow) => [String(row.id), row.syncHash]) ?? []
        );

        const clientsToInsert: capSQLiteSet[] = [];
        const clientsToUpdate: capSQLiteSet[] = [];
        const now = new Date().toISOString();

        for (const client of entities) {
            const localClient = ClientMapper.toLocal(client);
            if (!localClient.id) { continue; }
            const clientIdStr = String(localClient.id);

            const newHash = this.generateHash(localClient, keysToInclude);
            const isExisting = existingClientMap.has(clientIdStr);
            const needsUpdate = isExisting && existingClientMap.get(clientIdStr) !== newHash;

            if (needsUpdate) {
                const sql = `UPDATE clients SET firstname = ?, lastname = ?, fullName = ?, phone = ?, address = ?, dateOfBirth = ?, occupation = ?, clientType = ?, cardType = ?, cardID = ?, quarter = ?, commercial = ?, isLocal = ?, isSync = ?, syncDate = ?, syncHash = ?, latitude = ?, longitude = ?, mll = ?, contactPersonName = ?, contactPersonPhone = ?, contactPersonAddress = ?, code = ?, profilPhoto = ?, creditInProgress = ?, cardPhoto = ?, profilPhotoUrl = ?, cardPhotoUrl = ?, updatedPhotoUrl = ? WHERE id = ?`;
                const updateParams = [
                    localClient.firstname ?? null, localClient.lastname ?? null, localClient.fullName ?? null,
                    localClient.phone ?? null, localClient.address ?? null, localClient.dateOfBirth ?? null,
                    localClient.occupation ?? null, localClient.clientType ?? null, localClient.cardType ?? null,
                    localClient.cardID ?? null, localClient.quarter ?? null, localClient.commercial ?? null,
                    localClient.isLocal ? 1 : 0, localClient.isSync ? 1 : 0,
                    now, newHash, localClient.latitude ?? 0, localClient.longitude ?? 0,
                    localClient.mll ?? null, localClient.contactPersonName ?? null, localClient.contactPersonPhone ?? null,
                    localClient.contactPersonAddress ?? null, localClient.code ?? null, localClient.profilPhoto ?? null,
                    localClient.creditInProgress ? 1 : 0, localClient.cardPhoto ?? null,
                    localClient.profilPhotoUrl ?? null, localClient.cardPhotoUrl ?? null, localClient.updatedPhotoUrl ? 1 : 0,
                    clientIdStr
                ];
                clientsToUpdate.push({ statement: sql, values: updateParams });

            } else if (!isExisting) {
                const sql = `INSERT INTO clients (id, firstname, lastname, fullName, phone, address, dateOfBirth, occupation, clientType, cardType, cardID, quarter, commercial, isLocal, isSync, syncDate, syncHash, latitude, longitude, mll, contactPersonName, contactPersonPhone, contactPersonAddress, code, profilPhoto, creditInProgress, cardPhoto, profilPhotoUrl, cardPhotoUrl, updatedPhotoUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                const insertParams = [
                    clientIdStr, localClient.firstname ?? null, localClient.lastname ?? null, localClient.fullName ?? null,
                    localClient.phone ?? null, localClient.address ?? null, localClient.dateOfBirth ?? null,
                    localClient.occupation ?? null, localClient.clientType ?? null, localClient.cardType ?? null,
                    localClient.cardID ?? null, localClient.quarter ?? null, localClient.commercial ?? null,
                    localClient.isLocal ? 1 : 0, localClient.isSync ? 1 : 0,
                    now, newHash, localClient.latitude ?? 0, localClient.longitude ?? 0,
                    localClient.mll ?? null, localClient.contactPersonName ?? null, localClient.contactPersonPhone ?? null,
                    localClient.contactPersonAddress ?? null, localClient.code ?? null, localClient.profilPhoto ?? null,
                    localClient.creditInProgress ? 1 : 0, localClient.cardPhoto ?? null,
                    localClient.profilPhotoUrl ?? null, localClient.cardPhotoUrl ?? null, localClient.updatedPhotoUrl ? 1 : 0, localClient.createdAt ?? new Date()
                ];
                clientsToInsert.push({ statement: sql, values: insertParams });
            }
        }

        try {
            if (clientsToUpdate.length > 0) {
                await this.databaseService.executeSet(clientsToUpdate);
            }

            if (clientsToInsert.length > 0) {
                await this.databaseService.executeSet(clientsToInsert);
            }
        } catch (error) {
            console.error('Failed to save clients in repository.', error);
            throw error;
        }
    }

    // ==================== SPECIFIC UPDATE METHODS ====================

    /**
     * Update client location
     * @param id Client ID
     * @param latitude New latitude
     * @param longitude New longitude
     * @returns Updated client
     */
    async updateLocation(id: string, latitude: number, longitude: number): Promise<Client> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `UPDATE clients SET updated=1, latitude=?, longitude=? WHERE id=?`;
        await this.databaseService.execute(sql, [latitude, longitude, id]);

        const updatedClient = await this.databaseService.query('SELECT * FROM clients WHERE id = ?', [id]);
        if (updatedClient.values && updatedClient.values.length > 0) {
            return this.mapRowToClient(updatedClient.values[0]);
        } else {
            throw new Error(`Client with id ${id} not found after update.`);
        }
    }

    /**
     * Get clients that have been updated locally
     * @returns Array of updated clients
     */
    /**
     * Get clients that have been updated locally (Server origin but modified)
     * @param limit Limit results
     * @returns Array of updated clients
     */
    async findUpdated(limit: number = 50): Promise<Client[]> {
        const sql = `SELECT * FROM clients WHERE isLocal = 0 AND isSync = 0 LIMIT ?`;
        const result = await this.databaseService.query(sql, [limit]);
        return (result.values || []).map((row: any) => ClientMapper.fromLocal(row));
    }

    /**
     * Mark client location as synced
     * @param clientId Client ID
     */
    async markAsLocationSynced(clientId: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `UPDATE clients SET updated = 0 WHERE id = ?`;
        await this.databaseService.execute(sql, [clientId]);
    }

    /**
     * Get clients with updated photos
     * @returns Array of clients with updated photos
     */
    async getUpdatedPhotoClients(): Promise<Client[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const result = await this.databaseService.query('SELECT * FROM clients WHERE updatedPhoto = 1');
        return (result.values || []).map((row: any) => this.mapRowToClient(row));
    }

    /**
     * Mark client photos as synced
     * @param clientId Client ID
     */
    async markAsPhotoSynced(clientId: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `UPDATE clients SET updatedPhoto = 0 WHERE id = ?`;
        await this.databaseService.execute(sql, [clientId]);
    }

    /**
     * Update client photos and info
     * @param data Object containing update data
     * @returns Updated client
     */
    async updatePhotosAndInfo(data: { clientId: string; cardType: string; cardID: string; profilPhoto: string | null; cardPhoto: string | null; profilPhotoUrl?: string | null; cardPhotoUrl?: string | null; }): Promise<Client> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const sql = `UPDATE clients SET cardType = ?, cardID = ?, profilPhoto = ?, cardPhoto = ?, profilPhotoUrl = ?, cardPhotoUrl = ?, updatedPhoto = 1, updatedPhotoUrl = 1 WHERE id = ?`;

        const params = [
            data.cardType ?? null,
            data.cardID ?? null,
            data.profilPhoto ?? null,
            data.cardPhoto ?? null,
            data.profilPhotoUrl ?? data.profilPhoto ?? null,
            data.cardPhotoUrl ?? data.cardPhoto ?? null,
            data.clientId
        ];

        await this.databaseService.execute(sql, params);

        const updatedClient = await this.databaseService.query('SELECT * FROM clients WHERE id = ?', [data.clientId]);
        if (updatedClient.values && updatedClient.values.length > 0) {
            return this.mapRowToClient(updatedClient.values[0]);
        } else {
            throw new Error(`Client with id ${data.clientId} not found after update.`);
        }
    }

    /**
     * Update full client details
     * @param client Client object to update
     * @returns Updated client
     */
    async updateClient(client: Client): Promise<Client> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = ['id', 'firstname', 'lastname', 'phone', 'address', 'dateOfBirth', 'occupation', 'clientType', 'cardType', 'cardID', 'quarter', 'commercial', 'latitude', 'longitude', 'mll', 'contactPersonName', 'contactPersonPhone', 'contactPersonAddress', 'code', 'creditInProgress'];
        const newSyncHash = this.generateHash(client, keysToInclude);

        const sql = `UPDATE clients SET
          firstname = ?, lastname = ?, fullName = ?, phone = ?, address = ?, dateOfBirth = ?, occupation = ?,
          clientType = ?, cardType = ?, cardID = ?, quarter = ?, latitude = ?, longitude = ?, mll = ?,
          profilPhoto = ?, contactPersonName = ?, contactPersonPhone = ?, contactPersonAddress = ?,
          commercial = ?, creditInProgress = ?, isLocal = ?, isSync = ?, syncDate = ?, createdAt = ?,
          syncHash = ?, code = ?, cardPhoto = ?
          WHERE id = ?`;

        const fullName = `${client.firstname} ${client.lastname}`;

        await this.databaseService.execute(sql, [
            client.firstname, client.lastname, fullName, client.phone, client.address, client.dateOfBirth,
            client.occupation, client.clientType, client.cardType, client.cardID, client.quarter,
            client.latitude, client.longitude, client.mll, client.profilPhoto, client.contactPersonName,
            client.contactPersonPhone, client.contactPersonAddress, client.commercial,
            client.creditInProgress ? 1 : 0, client.isLocal ? 1 : 0, client.isSync ? 1 : 0,
            client.syncDate, client.createdAt, newSyncHash, client.code, client.cardPhoto, client.id
        ]);

        const updatedClient = await this.databaseService.query('SELECT * FROM clients WHERE id = ?', [client.id]);
        if (updatedClient.values && updatedClient.values.length > 0) {
            return this.mapRowToClient(updatedClient.values[0]);
        } else {
            throw new Error(`Client with id ${client.id} not found after update.`);
        }
    }

    /**
     * Get unsynced clients with pagination
     * @param commercialUsername Commercial username
     * @param limit Max number of items
     * @param offset Offset
     * @returns Array of unsynced clients
     */
    override async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<Client[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        // Client table uses 'commercial' as the column for username
        const sql = `SELECT * FROM clients WHERE isSync = 0 AND isLocal = 1 AND commercial = ? ORDER BY createdAt ASC LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [commercialUsername, limit, offset]);
        return (result.values || []).map((row: any) => this.mapRowToClient(row));
    }

    /**
     * Mark client as synced and update ID refs
     */
    async markAsSynced(localId: string, serverId: string, profilPhotoUrl?: string, cardPhotoUrl?: string): Promise<void> {
        if (!this.databaseService['db'] || localId === serverId) return;

        const updateSet: any[] = [
            { statement: `UPDATE accounts SET clientId = ? WHERE clientId = ?`, values: [serverId, localId] },
            { statement: `UPDATE distributions SET clientId = ? WHERE clientId = ?`, values: [serverId, localId] },
            { statement: `UPDATE recoveries SET clientId = ? WHERE clientId = ?`, values: [serverId, localId] },
            // transactions table might not exist in repository but was in SyncService? I'll check if table exists or if I should skip.
            // SyncService line 1184: UPDATE transactions ...
            // I'll include it if I'm sure. I'll rely on SyncService being correct.
            // But if specific tables belong to other modules, it's a bit messy.
            // I'll stick to what SyncService had:
            { statement: `UPDATE transactions SET clientId = ? WHERE clientId = ?`, values: [serverId, localId] },
            { statement: `UPDATE orders SET clientId = ? WHERE clientId = ?`, values: [serverId, localId] },
            { statement: `UPDATE tontine_members SET clientId = ? WHERE clientId = ?`, values: [serverId, localId] },
            {
                statement: `UPDATE clients SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime'), profilPhotoUrl = ?, cardPhotoUrl = ? WHERE id = ?`,
                values: [serverId, profilPhotoUrl || null, cardPhotoUrl || null, localId]
            }
        ];
        await this.databaseService.executeSet(updateSet);
    }

    /**
     * Map database row to Client object
     * @param row Database row
     * @returns Client object
     */
    private mapRowToClient(row: any): Client {
        return ClientMapper.toLocal(row);
    }

    /**
     * Delete a client and all related data
     * @param clientId Client ID
     */
    async deleteClientAndRelatedData(clientId: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        try {
            // Prepare a set of all delete statements
            // Order is important: delete "children" before "parents"
            const deleteSet: capSQLiteSet[] = [
                // Step 1: Delete distribution items linked to the client
                {
                    statement: `DELETE FROM distribution_items WHERE distributionId IN (SELECT id FROM distributions WHERE clientId = ?)`,
                    values: [clientId]
                },
                // Step 2: Delete client recoveries
                {
                    statement: `DELETE FROM recoveries WHERE clientId = ?`,
                    values: [clientId]
                },
                // Step 3: Delete client distributions
                {
                    statement: `DELETE FROM distributions WHERE clientId = ?`,
                    values: [clientId]
                },
                // Step 4: Delete client account
                {
                    statement: `DELETE FROM accounts WHERE clientId = ?`,
                    values: [clientId]
                },
                // Step 5: Finally, delete the client itself
                {
                    statement: `DELETE FROM clients WHERE id = ?`,
                    values: [clientId]
                }
            ];

            // Execute all operations transactionally
            await this.databaseService.executeSet(deleteSet);

            console.log(`Successfully deleted client ${clientId} and all related data.`);

        } catch (error) {
            console.error('Failed to delete client and related data:', error);
            throw error;
        }
    }

}
