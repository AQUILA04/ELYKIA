import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Client } from '../../models/client.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';
import { ClientMapper } from '../../shared/mapper/client.mapper';
import { LoggerService } from '../services/logger.service';

@Injectable({
    providedIn: 'root'
})
export class ClientRepository extends BaseRepository<Client, string> {
    protected tableName = 'clients';

    /** Filtre des clients synchronisés purgés avant une ré-initialisation. */
    private readonly syncedClientPurgeFilter = `
        commercial = ?
          AND isSync = 1
          AND isLocal = 0
          AND (updated = 0 OR updated IS NULL)
          AND (updatedPhoto = 0 OR updatedPhoto IS NULL)
          AND (updatedPhotoUrl = 0 OR updatedPhotoUrl IS NULL)
          AND (updatedInfo = 0 OR updatedInfo IS NULL)
    `;

    constructor(
        databaseService: DatabaseService,
        private log: LoggerService
    ) {
        super(databaseService);
    }

    async saveAll(entities: Client[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const sqlSet: capSQLiteSet[] = [];
        const now = new Date().toISOString();

        for (const client of entities) {
            const localClient = ClientMapper.toLocal(client);
            if (!localClient.id) { continue; }
            const clientIdStr = String(localClient.id);

            // UPSERT (pas INSERT OR REPLACE) : évite le DELETE implicite qui déclenche
            // les FK enfants (client_reliquats, orders legacy, tontine_members legacy).
            const sql = `INSERT INTO clients (
                id, firstname, lastname, fullName, phone, address, dateOfBirth, occupation,
                clientType, cardType, cardID, quarter, commercial, isLocal, isSync, syncDate,
                syncHash, latitude, longitude, mll, contactPersonName, contactPersonPhone,
                contactPersonAddress, code, profilPhoto, creditInProgress, businessCreditInProgress,
                businessCreditAuthorized, businessCreditAuthorizedBy, businessCreditAuthorizedAt,
                cardPhoto, profilPhotoUrl, cardPhotoUrl, profilPhotoThumbUrl, cardPhotoThumbUrl,
                updatedPhotoUrl, tontineCollector, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                firstname = excluded.firstname,
                lastname = excluded.lastname,
                fullName = excluded.fullName,
                phone = excluded.phone,
                address = excluded.address,
                dateOfBirth = excluded.dateOfBirth,
                occupation = excluded.occupation,
                clientType = excluded.clientType,
                cardType = excluded.cardType,
                cardID = excluded.cardID,
                quarter = excluded.quarter,
                commercial = excluded.commercial,
                isLocal = excluded.isLocal,
                isSync = excluded.isSync,
                syncDate = excluded.syncDate,
                syncHash = excluded.syncHash,
                latitude = excluded.latitude,
                longitude = excluded.longitude,
                mll = excluded.mll,
                contactPersonName = excluded.contactPersonName,
                contactPersonPhone = excluded.contactPersonPhone,
                contactPersonAddress = excluded.contactPersonAddress,
                code = excluded.code,
                profilPhoto = excluded.profilPhoto,
                creditInProgress = excluded.creditInProgress,
                businessCreditInProgress = excluded.businessCreditInProgress,
                businessCreditAuthorized = excluded.businessCreditAuthorized,
                businessCreditAuthorizedBy = excluded.businessCreditAuthorizedBy,
                businessCreditAuthorizedAt = excluded.businessCreditAuthorizedAt,
                cardPhoto = excluded.cardPhoto,
                profilPhotoUrl = excluded.profilPhotoUrl,
                cardPhotoUrl = excluded.cardPhotoUrl,
                profilPhotoThumbUrl = excluded.profilPhotoThumbUrl,
                cardPhotoThumbUrl = excluded.cardPhotoThumbUrl,
                updatedPhotoUrl = excluded.updatedPhotoUrl,
                tontineCollector = excluded.tontineCollector`;

            const params = [
                clientIdStr,
                localClient.firstname ?? null,
                localClient.lastname ?? null,
                localClient.fullName ?? null,
                localClient.phone ?? null,
                localClient.address ?? null,
                localClient.dateOfBirth ?? null,
                localClient.occupation ?? null,
                localClient.clientType ?? null,
                localClient.cardType ?? null,
                localClient.cardID ?? null,
                localClient.quarter ?? null,
                localClient.commercial ?? null,
                localClient.isLocal ? 1 : 0,
                localClient.isSync ? 1 : 0,
                now,
                null, // Plus de hash
                localClient.latitude ?? 0,
                localClient.longitude ?? 0,
                localClient.mll ?? null,
                localClient.contactPersonName ?? null,
                localClient.contactPersonPhone ?? null,
                localClient.contactPersonAddress ?? null,
                localClient.code ?? null,
                localClient.profilPhoto ?? null,
                localClient.creditInProgress ? 1 : 0,
                localClient.businessCreditInProgress ? 1 : 0,
                localClient.businessCreditAuthorized ? 1 : 0,
                localClient.businessCreditAuthorizedBy ?? null,
                localClient.businessCreditAuthorizedAt ?? null,
                localClient.cardPhoto ?? null,
                localClient.profilPhotoUrl ?? null,
                localClient.cardPhotoUrl ?? null,
                localClient.profilPhotoThumbUrl ?? null,
                localClient.cardPhotoThumbUrl ?? null,
                localClient.updatedPhotoUrl ? 1 : 0,
                localClient.tontineCollector ?? null,
                localClient.createdAt ?? now
            ];

            sqlSet.push({ statement: sql, values: params });
        }

        try {
            if (sqlSet.length > 0) {
                await this.databaseService.executeSet(sqlSet);
                this.log.log(`[ClientRepository] Successfully saved ${entities.length} clients (UPSERT).`);
            }
        } catch (error) {
            const detail = await this.diagnoseClientSaveFailure('saveAll', error, entities);
            this.log.error(`[ClientRepository] Failed to save clients. ${detail}`, error);
            throw new Error(`Échec sauvegarde clients: ${detail}`);
        }
    }

    /**
     * Supprime les clients déjà synchronisés (isSync = 1) pour un commercial,
     * en préservant les clients locaux non synchronisés et ceux avec des
     * modifications locales en attente (GPS, photos, fiche).
     * Purge d'abord les enfants avec FK active (reliquats, orders legacy…).
     */
    async deleteSyncedForReinit(commercialUsername: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const filter = this.syncedClientPurgeFilter;
        const clientSubquery = `SELECT id FROM clients WHERE ${filter}`;

        try {
            // 1) Enfants avec FK → clients(id) (sinon DELETE parents = code 787)
            await this.databaseService.execute(
                `DELETE FROM client_reliquats WHERE clientId IN (${clientSubquery})`,
                [commercialUsername]
            );

            // Orders legacy (migration v4) : FK clientId possible sur anciennes DB
            await this.safeExecute(
                `DELETE FROM order_items WHERE orderId IN (
                    SELECT id FROM orders WHERE clientId IN (${clientSubquery})
                )`,
                [commercialUsername],
                'order_items (legacy FK cleanup)'
            );
            await this.safeExecute(
                `DELETE FROM orders WHERE clientId IN (${clientSubquery})`,
                [commercialUsername],
                'orders (legacy FK cleanup)'
            );

            // 2) Parents
            await this.databaseService.execute(
                `DELETE FROM clients WHERE ${filter}`,
                [commercialUsername]
            );
            this.log.log(`[ClientRepository] Synced clients purged for ${commercialUsername} before re-initialization.`);
        } catch (error) {
            const detail = await this.diagnoseClientFkFailure('deleteSyncedForReinit', error, undefined, commercialUsername);
            this.log.error(`[ClientRepository] Failed to purge synced clients. ${detail}`, error);
            throw new Error(`Échec purge clients synchronisés: ${detail}`);
        }
    }

    private async safeExecute(sql: string, params: unknown[], label: string): Promise<void> {
        try {
            await this.databaseService.execute(sql, params);
        } catch (error) {
            // Table absente ou schéma différent : on log et on continue (diag FK plus bas si purge échoue)
            this.log.log(`[ClientRepository] Optional cleanup skipped (${label}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Diagnostique une erreur FK 787 en comptant les enfants qui référencent des clients.
     */
    private async diagnoseClientFkFailure(
        operation: string,
        error: unknown,
        candidateIds?: string[],
        commercialUsername?: string
    ): Promise<string> {
        const baseMsg = error instanceof Error ? error.message : String(error);
        if (!baseMsg.includes('FOREIGN KEY') && !baseMsg.includes('787')) {
            return baseMsg;
        }

        const childTables = [
            'client_reliquats',
            'accounts',
            'distributions',
            'recoveries',
            'transactions',
            'orders',
            'tontine_members'
        ];

        const findings: string[] = [];
        try {
            if (candidateIds && candidateIds.length > 0) {
                const sample = candidateIds.slice(0, 50);
                const placeholders = sample.map(() => '?').join(',');
                for (const table of childTables) {
                    try {
                        const res = await this.databaseService.query(
                            `SELECT COUNT(*) as cnt FROM ${table} WHERE clientId IN (${placeholders})`,
                            sample
                        );
                        const cnt = res.values?.[0]?.cnt ?? 0;
                        if (cnt > 0) {
                            findings.push(`${table}=${cnt}`);
                        }
                    } catch {
                        // table/colonne absente
                    }
                }
                findings.unshift(`operation=${operation}`, `candidateIdsSample=${sample.length}`);
            } else if (commercialUsername) {
                const filter = this.syncedClientPurgeFilter;
                for (const table of childTables) {
                    try {
                        const res = await this.databaseService.query(
                            `SELECT COUNT(*) as cnt FROM ${table} WHERE clientId IN (SELECT id FROM clients WHERE ${filter})`,
                            [commercialUsername]
                        );
                        const cnt = res.values?.[0]?.cnt ?? 0;
                        if (cnt > 0) {
                            findings.push(`${table}=${cnt}`);
                        }
                    } catch {
                        // table/colonne absente
                    }
                }
                findings.unshift(`operation=${operation}`, `commercial=${commercialUsername}`);
            } else {
                findings.push(`operation=${operation}`);
            }
        } catch (diagError) {
            findings.push(`diagFailed=${diagError instanceof Error ? diagError.message : String(diagError)}`);
        }

        const constraintHint = findings.length > 1
            ? `Contrainte FK probable sur enfants: ${findings.join(', ')}`
            : 'Contrainte FK (table enfant non identifiée)';
        return `${baseMsg} | ${constraintHint}`;
    }

    /**
     * Enrichit les erreurs batch clients avec l'identité précise du ou des clients suspects.
     */
    private async diagnoseClientSaveFailure(
        operation: string,
        error: unknown,
        entities: Client[]
    ): Promise<string> {
        const baseMsg = error instanceof Error ? error.message : String(error);
        const details: string[] = [];

        if (baseMsg.includes('FOREIGN KEY') || baseMsg.includes('787')) {
            details.push(await this.diagnoseClientFkFailure(
                operation,
                error,
                entities.map(c => String(c.id)).filter(Boolean)
            ));
        }

        if (baseMsg.includes('UNIQUE') || baseMsg.toLowerCase().includes('constraint')) {
            const uniqueHints = await this.diagnoseUniqueClientConflictCandidates(entities);
            if (uniqueHints.length > 0) {
                details.push(`Conflits clients suspects: ${uniqueHints.join(' | ')}`);
            }
        }

        if (details.length === 0) {
            return baseMsg;
        }

        return `${baseMsg} | ${details.join(' | ')}`;
    }

    private async diagnoseUniqueClientConflictCandidates(entities: Client[]): Promise<string[]> {
        const locals = entities
            .map(client => ClientMapper.toLocal(client))
            .filter(client => !!client.id);
        const hints: string[] = [];

        hints.push(...this.findIncomingBatchDuplicates(locals));

        for (const client of locals) {
            if (hints.length >= 8) {
                break;
            }
            const conflicts = await this.findExistingUniqueConflictCandidates(client);
            if (conflicts.length > 0) {
                hints.push(
                    `incoming(${this.formatClientIdentity(client)}) -> existing(${conflicts.map(conflict => this.formatClientIdentity(conflict)).join(' ; ')})`
                );
            }
        }

        return hints.slice(0, 8);
    }

    private findIncomingBatchDuplicates(clients: Client[]): string[] {
        const hints: string[] = [];
        const fields: Array<'phone' | 'cardID'> = ['phone', 'cardID'];

        for (const field of fields) {
            const groups = new Map<string, Client[]>();
            for (const client of clients) {
                const value = this.normalizeUniqueValue(client[field]);
                if (!value) {
                    continue;
                }
                const existing = groups.get(value) ?? [];
                existing.push(client);
                groups.set(value, existing);
            }

            for (const [value, groupedClients] of groups.entries()) {
                if (groupedClients.length > 1) {
                    hints.push(
                        `doublon lot ${field}=${value} -> ${groupedClients.map(client => this.formatClientIdentity(client)).join(' ; ')}`
                    );
                }
            }
        }

        return hints;
    }

    private async findExistingUniqueConflictCandidates(client: Client): Promise<Partial<Client>[]> {
        const phone = this.normalizeUniqueValue(client.phone);
        const cardID = this.normalizeUniqueValue(client.cardID);
        const clauses: string[] = [];
        const params: (string | number)[] = [String(client.id)];

        if (phone) {
            clauses.push(`(phone IS NOT NULL AND TRIM(phone) != '' AND phone = ?)`);
            params.push(phone);
        }
        if (cardID) {
            clauses.push(`(cardID IS NOT NULL AND TRIM(cardID) != '' AND cardID = ?)`);
            params.push(cardID);
        }
        if (clauses.length === 0) {
            return [];
        }

        const sql = `
            SELECT id, firstname, lastname, fullName, phone, cardID, code, commercial,
                   isLocal, isSync, updated, updatedInfo, updatedPhoto, updatedPhotoUrl
            FROM clients
            WHERE id != ?
              AND (${clauses.join(' OR ')})
            ORDER BY isLocal DESC, isSync ASC, createdAt ASC
            LIMIT 5
        `;

        try {
            const result = await this.databaseService.query(sql, params);
            return (result.values || []) as Partial<Client>[];
        } catch (error) {
            this.log.log(`[ClientRepository] Unique conflict lookup failed for ${this.formatClientIdentity(client)}: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }

    private formatClientIdentity(client: Partial<Client>): string {
        const first = typeof client.firstname === 'string' ? client.firstname : '';
        const last = typeof client.lastname === 'string' ? client.lastname : '';
        const fullName = (typeof client.fullName === 'string' ? client.fullName : `${first} ${last}`).trim() || 'N/A';
        const id = client.id != null ? String(client.id) : 'N/A';
        const cardID = this.normalizeUniqueValue(client.cardID) ?? 'null';
        const phone = this.normalizeUniqueValue(client.phone) ?? 'null';
        const code = this.normalizeUniqueValue(client.code) ?? 'null';
        const commercial = typeof client.commercial === 'string' ? client.commercial : 'N/A';
        const syncFlags = `isLocal=${client.isLocal ?? 'n/a'},isSync=${client.isSync ?? 'n/a'}`;
        return `id=${id},fullName=${fullName},cardID=${cardID},phone=${phone},code=${code},commercial=${commercial},${syncFlags}`;
    }

    private normalizeUniqueValue(value: string | null | undefined): string | null {
        const normalized = value?.trim();
        return normalized ? normalized : null;
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
     * Get clients with updated location
     * @returns Array of clients with updated location
     */
    async getUpdatedLocationClients(): Promise<Client[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const result = await this.databaseService.query('SELECT * FROM clients WHERE updated = 1');
        return (result.values || []).map((row: any) => this.mapRowToClient(row));
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
     * Get clients with updated photo URLs
     * @returns Array of clients with updated photo URLs
     */
    async getUpdatedPhotoUrlClients(): Promise<Client[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const result = await this.databaseService.query('SELECT * FROM clients WHERE updatedPhotoUrl = 1');
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
     * Mark client photo URLs as synced
     * @param clientId Client ID
     */
    async markAsPhotoUrlSynced(clientId: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `UPDATE clients SET updatedPhotoUrl = 0 WHERE id = ?`;
        await this.databaseService.execute(sql, [clientId]);
    }

    /**
     * Update client photos and info
     * @param data Object containing update data
     * @returns Updated client
     */
    async updatePhotosAndInfo(data: { clientId: string; cardType: string; cardID: string; profilPhoto: string | null; cardPhoto: string | null; profilPhotoUrl?: string | null; cardPhotoUrl?: string | null; profilPhotoThumbUrl?: string | null; cardPhotoThumbUrl?: string | null; }): Promise<Client> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const sql = `UPDATE clients SET cardType = ?, cardID = ?, profilPhoto = ?, cardPhoto = ?, profilPhotoUrl = ?, cardPhotoUrl = ?, profilPhotoThumbUrl = ?, cardPhotoThumbUrl = ?, updatedPhoto = 1, updatedPhotoUrl = 1 WHERE id = ?`;

        const params = [
            data.cardType ?? null,
            data.cardID ?? null,
            data.profilPhoto ?? null,
            data.cardPhoto ?? null,
            data.profilPhotoUrl ?? data.profilPhoto ?? null,
            data.cardPhotoUrl ?? data.cardPhoto ?? null,
            data.profilPhotoThumbUrl ?? null,
            data.cardPhotoThumbUrl ?? null,
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
     * Update full client details (texte + GPS, sans photos).
     * Client synchronisé : updatedInfo = 1. Client local : isSync = 0.
     */
    async updateClient(client: Client): Promise<Client> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = ['id', 'firstname', 'lastname', 'phone', 'address', 'dateOfBirth', 'occupation', 'clientType', 'cardType', 'cardID', 'quarter', 'commercial', 'latitude', 'longitude', 'mll', 'contactPersonName', 'contactPersonPhone', 'contactPersonAddress', 'code', 'creditInProgress', 'tontineCollector'];
        const newSyncHash = this.generateHash(client, keysToInclude);
        const fullName = `${client.firstname} ${client.lastname}`;

        const isSyncedServerClient = client.isSync && !client.isLocal;
        const updatedInfo = isSyncedServerClient ? 1 : 0;
        const isSync = isSyncedServerClient ? 1 : 0;
        const isLocal = client.isLocal ? 1 : 0;

        const sql = `UPDATE clients SET
          firstname = ?, lastname = ?, fullName = ?, phone = ?, address = ?, dateOfBirth = ?, occupation = ?,
          clientType = ?, cardType = ?, cardID = ?, quarter = ?, latitude = ?, longitude = ?, mll = ?,
          contactPersonName = ?, contactPersonPhone = ?, contactPersonAddress = ?,
          commercial = ?, creditInProgress = ?, isLocal = ?, isSync = ?, syncDate = ?, createdAt = ?,
          syncHash = ?, code = ?, tontineCollector = ?, updatedInfo = ?
          WHERE id = ?`;

        await this.databaseService.execute(sql, [
            client.firstname, client.lastname, fullName, client.phone, client.address, client.dateOfBirth,
            client.occupation, client.clientType, client.cardType, client.cardID, client.quarter,
            client.latitude, client.longitude, client.mll, client.contactPersonName,
            client.contactPersonPhone, client.contactPersonAddress, client.commercial,
            client.creditInProgress ? 1 : 0, isLocal, isSync,
            client.syncDate, client.createdAt, newSyncHash, client.code, client.tontineCollector,
            updatedInfo, client.id
        ]);

        const updatedClient = await this.databaseService.query('SELECT * FROM clients WHERE id = ?', [client.id]);
        if (updatedClient.values && updatedClient.values.length > 0) {
            return this.mapRowToClient(updatedClient.values[0]);
        } else {
            throw new Error(`Client with id ${client.id} not found after update.`);
        }
    }

    async getUpdatedInfoClients(): Promise<Client[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const result = await this.databaseService.query('SELECT * FROM clients WHERE updatedInfo = 1');
        return (result.values || []).map((row: any) => this.mapRowToClient(row));
    }

    async countUpdatedInfo(): Promise<number> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const result = await this.databaseService.query('SELECT COUNT(*) as total FROM clients WHERE updatedInfo = 1');
        return result.values?.[0]?.total || 0;
    }

    async markAsInfoSynced(clientId: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        await this.databaseService.execute('UPDATE clients SET updatedInfo = 0 WHERE id = ?', [clientId]);
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
     * Avant import serveur : fusionne un client local (UUID) doublon avec le client entrant
     * (même téléphone, carte ou code), pour éviter les violations UNIQUE à l'INSERT.
     */
    async reconcileLocalDuplicateIfAny(serverClient: Client, commercialUsername: string): Promise<boolean> {
        const localIds = await this.findStaleLocalDuplicateIds(serverClient, commercialUsername);
        if (localIds.length === 0) {
            return false;
        }
        const serverId = String(serverClient.id);
        for (const localId of localIds) {
            await this.mergeLocalClientIntoServerId(localId, serverId, { deleteLocalOnly: true });
            this.log.log(`[ClientRepository] Reconciled local duplicate ${localId} → server ${serverId} before import.`);
        }
        return true;
    }

    /**
     * Fusionne en lot les doublons locaux détectés pour une page de clients serveur.
     */
    async reconcileIncomingServerClients(clients: Client[], commercialUsername: string): Promise<number> {
        let merged = 0;
        for (const client of clients) {
            if (await this.reconcileLocalDuplicateIfAny(client, commercialUsername)) {
                merged++;
            }
        }
        return merged;
    }

    /**
     * Mark client as synced and update ID refs
     */
    async markAsSynced(localId: string, serverId: string, profilPhotoUrl?: string, cardPhotoUrl?: string): Promise<void> {
        if (!this.databaseService['db'] || localId === serverId) {
            return;
        }
        await this.mergeLocalClientIntoServerId(localId, serverId, { profilPhotoUrl, cardPhotoUrl });
        console.log(`[ClientRepository] Client ${localId} marked as synced with server ID ${serverId}.`);
    }

    /**
     * Repointe les entités enfants vers le nouvel identifiant client.
     */
    private buildReassignClientChildrenStatements(fromId: string, toId: string): capSQLiteSet[] {
        return [
            { statement: `UPDATE accounts SET clientId = ? WHERE clientId = ?`, values: [toId, fromId] },
            { statement: `UPDATE distributions SET clientId = ? WHERE clientId = ?`, values: [toId, fromId] },
            { statement: `UPDATE recoveries SET clientId = ? WHERE clientId = ?`, values: [toId, fromId] },
            { statement: `UPDATE transactions SET clientId = ? WHERE clientId = ?`, values: [toId, fromId] },
            { statement: `UPDATE orders SET clientId = ? WHERE clientId = ?`, values: [toId, fromId] },
            { statement: `UPDATE tontine_members SET clientId = ? WHERE clientId = ?`, values: [toId, fromId] },
            { statement: `UPDATE client_reliquats SET clientId = ? WHERE clientId = ?`, values: [toId, fromId] },
        ];
    }

    /**
     * Trouve un client local obsolète (UUID) qui correspond au même client serveur.
     */
    private async findStaleLocalDuplicateIds(serverClient: Client, commercialUsername: string): Promise<string[]> {
        const serverId = String(serverClient.id);
        const phone = this.normalizeUniqueValue(serverClient.phone);
        const cardID = this.normalizeUniqueValue(serverClient.cardID);
        const code = this.normalizeUniqueValue(serverClient.code);

        if (!phone && !cardID && !code) {
            return [];
        }

        const matchClauses: string[] = [];
        const params: (string | number)[] = [commercialUsername, serverId];

        if (phone) {
            matchClauses.push(`(phone IS NOT NULL AND phone != '' AND phone = ?)`);
            params.push(phone);
        }
        if (cardID) {
            matchClauses.push(`(cardID IS NOT NULL AND cardID != '' AND cardID = ?)`);
            params.push(cardID);
        }
        if (code) {
            matchClauses.push(`(code IS NOT NULL AND code != '' AND code = ?)`);
            params.push(code);
        }

        const sql = `
            SELECT id FROM clients
            WHERE commercial = ?
              AND id != ?
              AND (${matchClauses.join(' OR ')})
              AND isLocal = 1
              AND isSync = 0
            ORDER BY createdAt ASC
            LIMIT 1
        `;

        const result = await this.databaseService.query(sql, params);
        return (result.values || [])
            .map((row: Record<string, unknown>) => row['id'] ? String(row['id']) : null)
            .filter((id: string | null): id is string => !!id);
    }

    /**
     * Fusionne un client local vers l'ID serveur :
     * - réaffecte les enfants ;
     * - supprime le doublon local si la ligne serveur existe déjà ou en pré-import ;
     * - sinon réécrit l'ID local vers l'ID serveur.
     */
    private async mergeLocalClientIntoServerId(
        localId: string,
        serverId: string,
        options?: { profilPhotoUrl?: string | null; cardPhotoUrl?: string | null; deleteLocalOnly?: boolean }
    ): Promise<void> {
        if (localId === serverId) {
            return;
        }

        const existingServerRow = await this.findById(serverId);
        const updateSet: capSQLiteSet[] = this.buildReassignClientChildrenStatements(localId, serverId);

        if (existingServerRow || options?.deleteLocalOnly) {
            updateSet.push({ statement: `DELETE FROM clients WHERE id = ?`, values: [localId] });
            if (existingServerRow && !options?.deleteLocalOnly) {
                updateSet.push({
                    statement: `UPDATE clients SET isSync = 1, isLocal = 0, syncDate = datetime('now', 'localtime'), profilPhotoUrl = ?, cardPhotoUrl = ? WHERE id = ?`,
                    values: [options?.profilPhotoUrl ?? null, options?.cardPhotoUrl ?? null, serverId]
                });
            }
        } else {
            updateSet.push({
                statement: `UPDATE clients SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime'), profilPhotoUrl = ?, cardPhotoUrl = ? WHERE id = ?`,
                values: [serverId, options?.profilPhotoUrl ?? null, options?.cardPhotoUrl ?? null, localId]
            });
        }

        try {
            await this.databaseService.executeSet(updateSet);
        } catch (error) {
            const detail = await this.diagnoseClientFkFailure('mergeLocalClientIntoServerId', error, [localId, serverId]);
            this.log.error(`[ClientRepository] Failed to merge local client ${localId} → ${serverId}. ${detail}`, error);
            throw new Error(`Échec fusion client local→serveur: ${detail}`);
        }
        await this.saveIdMapping(localId, serverId, 'client');
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

    /**
     * Get all clients for a commercial (for daily report)
     * @param commercialUsername Commercial username
     * @returns Array of all clients
     */
    async findAllByCommercial(commercialUsername: string): Promise<Client[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `SELECT * FROM clients WHERE commercial = ?`;
        const result = await this.databaseService.query(sql, [commercialUsername]);
        return (result.values || []).map((row: any) => this.mapRowToClient(row));
    }

    /**
     * Get new clients created on a specific date for a commercial
     * @param commercialUsername Commercial username
     * @param date Date string (YYYY-MM-DD)
     * @returns Array of new clients with their accounts
     */
    async findNewClientsByDate(commercialUsername: string, date: string): Promise<any[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        // We join with accounts to get the balance
        const sql = `
            SELECT c.*, a.accountNumber, a.accountBalance
            FROM clients c
            LEFT JOIN accounts a ON c.id = a.clientId
            WHERE c.commercial = ? AND c.createdAt LIKE ?
        `;
        const result = await this.databaseService.query(sql, [commercialUsername, `${date}%`]);
        return (result.values || []).map((row: any) => ({
            ...this.mapRowToClient(row),
            accountNumber: row.accountNumber,
            accountBalance: row.accountBalance
        }));
    }

}
