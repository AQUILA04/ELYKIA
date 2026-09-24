import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Distribution } from '../../models/distribution.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';
import { DistributionMapper } from '../../shared/mapper/distribution.mapper';
import { DistributionItem } from '../../models/distribution-item.model';

@Injectable({
    providedIn: 'root'
})
export class DistributionRepository extends BaseRepository<Distribution, string> {
    protected tableName = 'distributions';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Distribution[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = ['id', 'reference', 'totalAmount', 'dailyPayment', 'startDate', 'endDate', 'status'];
        const existingRows = await this.databaseService.query('SELECT id, syncHash FROM distributions');

        const existingDistributionMap = new Map<string, string>(
            existingRows.values?.map((row: any) => [String(row.id), row.syncHash]) ?? []
        );

        const distributionsToUpdate: capSQLiteSet[] = [];
        const distributionsToInsert: capSQLiteSet[] = [];
        const allItemsToInsert: capSQLiteSet[] = [];
        const distributionIdsToClearItems: string[] = [];
        const now = new Date().toISOString();

        for (const dist of entities) {
            const localDist = DistributionMapper.toLocal(dist);
            const distIdStr = String(localDist.id);
            if (!distIdStr) { continue; }

            const newHash = this.generateHash(dist, keysToInclude);
            const isExisting = existingDistributionMap.has(distIdStr);
            const needsUpdate = isExisting && existingDistributionMap.get(distIdStr) !== newHash;

            if (isExisting && !needsUpdate) {
                continue;
            }

            const hasNewItems = localDist.items && localDist.items.length > 0;

            // Ne supprimer les items existants que si on a de nouveaux items à insérer.
            // Si items absents (ex: updateDistributionAmounts/updateDistributionStatus),
            // on préserve les items existants pour ne pas les perdre.
            if (needsUpdate && hasNewItems) {
                distributionIdsToClearItems.push(distIdStr);
            }

            if (needsUpdate) {
                const sql = `UPDATE distributions SET reference=?, creditId=?, totalAmount=?, dailyPayment=?, startDate=?, endDate=?, status=?, clientId=?, commercialId=?, isLocal=?, isSync=?, syncDate=?, createdAt=?, syncHash=?, articleCount=?, remainingAmount=?, paidAmount=?, advance=?, creditPurpose=? WHERE id=?`;
                distributionsToUpdate.push({
                    statement: sql,
                    values: [
                        localDist.reference ?? null, localDist.creditId ?? null, localDist.totalAmount ?? 0,
                        localDist.dailyPayment ?? 0, localDist.startDate ?? null, localDist.endDate ?? null,
                        localDist.status ?? null, localDist.clientId ?? null, localDist.commercialId ?? null,
                        localDist.isLocal ? 1 : 0, localDist.isSync ? 1 : 0, now,
                        localDist.createdAt ?? now, newHash, localDist.articleCount ?? 0,
                        localDist.remainingAmount ?? localDist.totalAmount ?? 0,
                        localDist.paidAmount ?? 0, localDist.advance ?? 0,
                        localDist.creditPurpose ?? null, distIdStr
                    ]
                });
            } else if (!isExisting) {
                const sql = `INSERT INTO distributions (id, reference, creditId, totalAmount, dailyPayment, startDate, endDate, status, clientId, commercialId, isLocal, isSync, syncDate, createdAt, syncHash, articleCount, remainingAmount, paidAmount, advance, creditPurpose) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                distributionsToInsert.push({
                    statement: sql,
                    values: [
                        distIdStr, localDist.reference ?? null, localDist.creditId ?? null, localDist.totalAmount ?? 0,
                        localDist.dailyPayment ?? 0, localDist.startDate ?? null, localDist.endDate ?? null,
                        localDist.status ?? null, localDist.clientId ?? null, localDist.commercialId ?? null,
                        localDist.isLocal ? 1 : 0, localDist.isSync ? 1 : 0, now,
                        localDist.createdAt ?? now, newHash, localDist.articleCount ?? 0,
                        localDist.remainingAmount ?? localDist.totalAmount ?? 0,
                        localDist.paidAmount ?? 0, localDist.advance ?? 0,
                        localDist.creditPurpose ?? null
                    ]
                });
            }

            if (hasNewItems) {
                const sql = `INSERT INTO distribution_items (id, distributionId, articleId, quantity, unitPrice, totalPrice) VALUES (?,?,?,?,?,?)`;
                for (const item of localDist.items!) {
                    allItemsToInsert.push({
                        statement: sql,
                        values: [
                            item.id ?? this.generateUuid(),
                            distIdStr,
                            item.articleId ?? null,
                            item.quantity ?? 0,
                            item.unitPrice ?? 0,
                            item.totalPrice ?? 0
                        ]
                    });
                }
            }
        }

        try {
            if (distributionIdsToClearItems.length > 0) {
                const placeholders = distributionIdsToClearItems.map(() => '?').join(',');
                const sql = `DELETE FROM distribution_items WHERE distributionId IN (${placeholders})`;
                await this.databaseService.execute(sql, distributionIdsToClearItems);
            }

            if (distributionsToUpdate.length > 0) {
                await this.databaseService.executeSet(distributionsToUpdate);
            }

            if (distributionsToInsert.length > 0) {
                await this.databaseService.executeSet(distributionsToInsert);
            }

            if (allItemsToInsert.length > 0) {
                await this.databaseService.executeSet(allItemsToInsert);
            }

        } catch (error) {
            console.error('Failed to save distributions in repository.', error);
            throw error;
        }
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get all distribution items
     * @returns Array of all distribution items
     */
    async getAllItems(): Promise<DistributionItem[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        const ret = await this.databaseService.query('SELECT * FROM distribution_items');
        return ret.values || [];
    }

    /**
     * Get items for a specific distribution
     * @param distributionId ID of the distribution
     * @returns Array of items for the specified distribution
     */
    async getItemsForDistribution(distributionId: string): Promise<DistributionItem[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        const sql = `SELECT * FROM distribution_items WHERE distributionId = ?`;
        const ret = await this.databaseService.query(sql, [distributionId]);
        return ret.values || [];
    }

    /**
     * Get active distributions for a specific client
     * @param clientId ID of the client
     * @returns Array of active distributions (with remaining amount > 0)
     */
    async getActiveByClientId(clientId: string): Promise<Distribution[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        const sql = `
            SELECT * FROM distributions
            WHERE clientId = ? AND remainingAmount > 0
            ORDER BY createdAt DESC
        `;
        const ret = await this.databaseService.query(sql, [clientId]);
        return ret.values || [];
    }

    /**
     * Get unsynced distributions with pagination
     * @param commercialUsername Commercial username (filtered by ID in Distributions table, assuming username matches commercialId or need mapping? SyncService uses commercialId=username)
     * @param limit Max number of items
     * @param offset Offset
     */
    async hasUnsyncedForClient(clientId: string): Promise<boolean> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const result = await this.databaseService.query(
            `SELECT COUNT(*) as total FROM distributions WHERE clientId = ? AND isSync = 0 AND isLocal = 1`,
            [clientId]
        );
        return (result.values?.[0]?.total || 0) > 0;
    }

    override async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<Distribution[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `SELECT * FROM distributions WHERE isSync = 0 AND isLocal = 1 AND commercialId = ? ORDER BY createdAt ASC LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [commercialUsername, limit, offset]);
        return (result.values || []).map((row: any) => this.mapRowToDistribution(row));
    }

    async markAsSynced(localId: string, serverId: string): Promise<void> {
        if (!this.databaseService['db']) {
            return;
        }
        if (localId === serverId) {
            await this.databaseService.execute(
                `UPDATE distributions SET isSync = 1, isLocal = 0, syncDate = datetime('now', 'localtime') WHERE id = ?`,
                [localId]
            );
            return;
        }
        const updateSet = [
            { statement: `UPDATE recoveries SET distributionId = ? WHERE distributionId = ?`, values: [serverId, localId] },
            { statement: `UPDATE distribution_items SET distributionId = ? WHERE distributionId = ?`, values: [serverId, localId] },
            { statement: `UPDATE distributions SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`, values: [serverId, localId] }
        ];
        await this.databaseService.executeSet(updateSet);
    }

    /**
     * Avant un pull serveur : réécrit ou fusionne les UUID locaux déjà liés au crédit
     * (id_mappings / creditId / reference) pour éviter uuid + id numérique côte à côte.
     */
    async reconcileIncomingServerDistributions(distributions: Distribution[]): Promise<number> {
        if (!this.databaseService['db'] || !distributions?.length) {
            return 0;
        }

        let merged = 0;
        for (const dist of distributions) {
            const serverId = dist?.id != null ? String(dist.id) : '';
            if (!serverId) {
                continue;
            }

            const existingAtServerId = await this.findById(serverId);
            if (existingAtServerId) {
                continue;
            }

            const mappedLocalId = await this.findLocalIdByServerId(serverId, 'distribution');
            if (mappedLocalId && mappedLocalId !== serverId) {
                const localRow = await this.findById(mappedLocalId);
                if (localRow) {
                    await this.mergeLocalRowIntoServerId(mappedLocalId, serverId);
                    merged++;
                    continue;
                }
            }

            const creditId = dist.creditId != null ? String(dist.creditId) : null;
            if (creditId) {
                const byCredit = await this.findLocalRowByBusinessKey('creditId', creditId, serverId);
                if (byCredit) {
                    await this.mergeLocalRowIntoServerId(String(byCredit.id), serverId);
                    merged++;
                    continue;
                }
            }

            const reference = dist.reference ? String(dist.reference).trim() : '';
            if (reference) {
                const byRef = await this.findLocalRowByBusinessKey('reference', reference, serverId);
                if (byRef) {
                    await this.mergeLocalRowIntoServerId(String(byRef.id), serverId);
                    merged++;
                }
            }
        }
        return merged;
    }

    /**
     * Guérit les doublons déjà présents : UUID local + ligne serveur (même client/montant INPROGRESS).
     * Déplace recoveries/items vers l'id serveur puis supprime l'UUID — jamais de cascade-delete recoveries.
     */
    async healSyncedLocalDuplicates(commercialUsername: string): Promise<number> {
        if (!this.databaseService['db'] || !commercialUsername) {
            return 0;
        }

        const sql = `
            SELECT d_local.id AS localId, d_sync.id AS serverId
            FROM distributions d_local
            INNER JOIN distributions d_sync
              ON d_local.clientId = d_sync.clientId
              AND d_local.totalAmount = d_sync.totalAmount
              AND d_local.status = 'INPROGRESS'
              AND d_sync.status = 'INPROGRESS'
            WHERE d_local.isLocal = 1
              AND d_sync.isSync = 1
              AND d_local.id != d_sync.id
              AND d_local.commercialId = ?
              AND d_sync.commercialId = ?
        `;
        const result = await this.databaseService.query(sql, [commercialUsername, commercialUsername]);
        const pairs: Array<{ localId: string; serverId: string }> = (result.values || []).map(
            (row: { localId: string; serverId: string }) => ({
                localId: String(row.localId),
                serverId: String(row.serverId)
            })
        );

        let healed = 0;
        for (const pair of pairs) {
            // Prefer treating non-numeric id as the local twin
            const localLooksUuid = !/^\d+$/.test(pair.localId);
            const localId = localLooksUuid ? pair.localId : pair.serverId;
            const serverId = localLooksUuid ? pair.serverId : pair.localId;
            if (localId === serverId) {
                continue;
            }
            await this.mergeLocalRowIntoServerId(localId, serverId);
            healed++;
        }
        return healed;
    }

    /**
     * Si la ligne serveur existe déjà : déplace les FKs puis supprime l'UUID.
     * Sinon : réécrit la PK locale vers l'id serveur (markAsSynced).
     */
    async mergeLocalRowIntoServerId(localId: string, serverId: string): Promise<void> {
        if (!this.databaseService['db'] || localId === serverId) {
            if (localId === serverId) {
                await this.markAsSynced(localId, serverId);
            }
            return;
        }

        const serverExists = await this.findById(serverId);
        if (!serverExists) {
            await this.saveIdMapping(localId, serverId, 'distribution');
            await this.markAsSynced(localId, serverId);
            return;
        }

        const updateSet: capSQLiteSet[] = [
            {
                statement: `UPDATE recoveries SET distributionId = ? WHERE distributionId = ?`,
                values: [serverId, localId]
            },
            {
                statement: `DELETE FROM distribution_items WHERE distributionId = ?`,
                values: [localId]
            },
            {
                statement: `DELETE FROM distributions WHERE id = ?`,
                values: [localId]
            }
        ];
        await this.databaseService.executeSet(updateSet);
        await this.saveIdMapping(localId, serverId, 'distribution');
    }

    private async findLocalIdByServerId(serverId: string, entityType: string): Promise<string | null> {
        const result = await this.databaseService.query(
            `SELECT localId FROM id_mappings WHERE serverId = ? AND entityType = ? LIMIT 1`,
            [serverId, entityType]
        );
        if (result.values?.length) {
            return String(result.values[0].localId);
        }
        return null;
    }

    private async findLocalRowByBusinessKey(
        column: 'creditId' | 'reference',
        value: string,
        excludeServerId: string
    ): Promise<Distribution | null> {
        const sql = `SELECT * FROM distributions WHERE ${column} = ? AND id != ? LIMIT 1`;
        const result = await this.databaseService.query(sql, [value, excludeServerId]);
        if (result.values?.length) {
            return this.mapRowToDistribution(result.values[0]);
        }
        return null;
    }

    // ==================== SPECIFIC UPDATE METHODS ====================

    /**
     * Update a distribution
     * @param distribution Distribution object to update
     * @returns Updated distribution
     */
    async updateDistribution(distribution: Distribution): Promise<Distribution> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = ['id', 'reference', 'totalAmount', 'dailyPayment', 'paidAmount', 'remainingAmount', 'advance', 'startDate', 'endDate', 'status'];
        const newSyncHash = this.generateHash(distribution, keysToInclude);
        const now = new Date().toISOString();

        const sql = `UPDATE distributions SET reference = ?, creditId = ?, totalAmount = ?, dailyPayment = ?, startDate = ?, endDate = ?, status = ?, clientId = ?, commercialId = ?, isLocal = ?, isSync = ?, syncDate = ?, createdAt = ?, syncHash = ?, articleCount = ?, remainingAmount = ?, paidAmount = ?, advance = ? WHERE id = ?`;

        const localDist = DistributionMapper.toLocal(distribution);
        if (localDist.totalAmount == localDist.paidAmount) {
          localDist.status = 'SETTLED';
        }

        await this.databaseService.execute(sql, [
            localDist.reference ?? null,
            localDist.creditId ?? null,
            localDist.totalAmount ?? 0,
            localDist.dailyPayment ?? 0,
            localDist.startDate ?? null,
            localDist.endDate ?? null,
            localDist.status ?? null,
            localDist.clientId ?? null,
            localDist.commercialId ?? null,
            localDist.isLocal ? 1 : 0,
            localDist.isSync ? 1 : 0,
            now,
            localDist.createdAt ?? now,
            newSyncHash,
            localDist.articleCount ?? 0,
            localDist.remainingAmount ?? localDist.totalAmount ?? 0,
            localDist.paidAmount ?? 0,
            localDist.advance ?? 0,
            localDist.id
        ]);

        const updatedDist = await this.databaseService.query('SELECT * FROM distributions WHERE id = ?', [localDist.id]);
        if (updatedDist.values && updatedDist.values.length > 0) {
            return this.mapRowToDistribution(updatedDist.values[0]);
        } else {
            throw new Error(`Distribution with id ${localDist.id} not found after update.`);
        }
    }

    /**
     * Map database row to Distribution object
     * @param row Database row
     * @returns Distribution object
     */
    private mapRowToDistribution(row: any): Distribution {
        return DistributionMapper.toLocal(row);
    }

    /**
     * Save a list of distribution items
     * Updates existing items and inserts new ones
     * @param items List of items to save
     */
    async saveDistributionItems(items: DistributionItem[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        // 1. Get IDs of all existing items
        const existingRows = await this.databaseService.query('SELECT id FROM distribution_items');
        const existingItemIds = new Set<string>(
            existingRows.values?.map((row: any) => String(row.id)) ?? []
        );

        const itemsToInsert: capSQLiteSet[] = [];
        const itemsToUpdate: capSQLiteSet[] = [];

        // 2. Sort items into insert and update lists
        for (const item of items) {
            if (!item || item.id === undefined) {
                console.warn('Skipping item with no ID:', item);
                continue;
            }
            const itemIdStr = String(item.id);

            if (existingItemIds.has(itemIdStr)) {
                // Item exists: prepare UPDATE
                const sql = `UPDATE distribution_items SET distributionId = ?, articleId = ?, quantity = ?, unitPrice = ?, totalPrice = ? WHERE id = ?`;
                const updateParams = [
                    item.distributionId ?? null,
                    item.articleId ?? null,
                    item.quantity ?? 0,
                    item.unitPrice ?? 0,
                    item.totalPrice ?? 0,
                    itemIdStr
                ];
                itemsToUpdate.push({ statement: sql, values: updateParams });

            } else {
                // Item is new: prepare INSERT
                const sql = `INSERT INTO distribution_items (id, distributionId, articleId, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?)`;
                const insertParams = [
                    itemIdStr,
                    item.distributionId ?? null,
                    item.articleId ?? null,
                    item.quantity ?? 0,
                    item.unitPrice ?? 0,
                    item.totalPrice ?? 0
                ];
                itemsToInsert.push({ statement: sql, values: insertParams });
            }
        }

        // 3. Execute batch operations
        try {
            if (itemsToUpdate.length > 0) {
                await this.databaseService.executeSet(itemsToUpdate);
            }

            if (itemsToInsert.length > 0) {
                await this.databaseService.executeSet(itemsToInsert);
            }

        } catch (error) {
            console.error('Failed to save distribution items in repository.', error);
            throw error;
        }
    }

    /**
     * Get distributions created on a specific date for a commercial
     * @param commercialUsername Commercial username
     * @param date Date string (YYYY-MM-DD)
     * @returns Array of distributions with client names
     */
    async findByCommercialAndDate(commercialUsername: string, date: string): Promise<any[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `
            SELECT d.*, c.fullName as clientName
            FROM distributions d
            LEFT JOIN clients c ON d.clientId = c.id
            WHERE d.commercialId = ? AND d.createdAt LIKE ?
        `;
        const result = await this.databaseService.query(sql, [commercialUsername, `${date}%`]);
        return (result.values || []).map((row: any) => ({
            ...this.mapRowToDistribution(row),
            clientName: row.clientName
        }));
    }

    /**
     * Distributions locales filtrées par plage de dates sur createdAt.
     * @param beforeDate Borne haute exclusive (YYYY-MM-DD)
     * @param fromDateInclusive Borne basse inclusive ; si absent, pas de borne basse
     */
    async findLocalDistributionsForCleanup(
        commercialUsername: string,
        beforeDate: string,
        fromDateInclusive?: string
    ): Promise<Distribution[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const sql = `
            SELECT d.*, c.fullName as clientName
            FROM distributions d
            LEFT JOIN clients c ON d.clientId = c.id
            WHERE d.isLocal = 1
              AND d.commercialId = ?
              AND date(d.createdAt) < date(?)
              AND (? IS NULL OR date(d.createdAt) >= date(?))
            ORDER BY d.createdAt DESC
        `;
        const fromParam = fromDateInclusive ?? null;
        const result = await this.databaseService.query(sql, [
            commercialUsername,
            beforeDate,
            fromParam,
            fromParam
        ]);
        return (result.values || []).map((row: any) => ({
            ...this.mapRowToDistribution(row),
            clientName: row.clientName
        }));
    }

    /**
     * Trouve les distributions locales en doublon d'une distribution synchronisée
     * (même client, même montant, statut INPROGRESS).
     */
    async findSyncedLocalDuplicateLocalIds(commercialUsername: string): Promise<string[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const sql = `
            SELECT DISTINCT d_local.id AS localId
            FROM distributions d_local
            INNER JOIN distributions d_sync
              ON d_local.clientId = d_sync.clientId
              AND d_local.totalAmount = d_sync.totalAmount
              AND d_local.status = 'INPROGRESS'
              AND d_sync.status = 'INPROGRESS'
            WHERE d_local.isLocal = 1
              AND d_sync.isSync = 1
              AND d_local.id != d_sync.id
              AND d_local.commercialId = ?
              AND d_sync.commercialId = ?
        `;
        const result = await this.databaseService.query(sql, [commercialUsername, commercialUsername]);
        return (result.values || []).map((row: { localId: string }) => String(row.localId));
    }

    /**
     * Supprime une distribution, ses lignes et les recouvrements associés.
     */
    async deleteDistributionCascade(distributionId: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const deleteSet: capSQLiteSet[] = [
            {
                statement: `DELETE FROM recoveries WHERE distributionId = ?`,
                values: [distributionId]
            },
            {
                statement: `DELETE FROM distribution_items WHERE distributionId = ?`,
                values: [distributionId]
            },
            {
                statement: `DELETE FROM distributions WHERE id = ?`,
                values: [distributionId]
            }
        ];

        await this.databaseService.executeSet(deleteSet);
        console.log(`Successfully deleted distribution ${distributionId} with recoveries and items.`);
    }

    /**
     * Delete a distribution and its items
     * @param distributionId ID of the distribution to delete
     */
    async deleteDistribution(distributionId: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        try {
            const deleteSet: capSQLiteSet[] = [
                {
                    statement: `DELETE FROM distribution_items WHERE distributionId = ?`,
                    values: [distributionId]
                },
                {
                    statement: `DELETE FROM distributions WHERE id = ?`,
                    values: [distributionId]
                }
            ];

            await this.databaseService.executeSet(deleteSet);
            console.log(`Successfully deleted distribution ${distributionId} and its items.`);
        } catch (error) {
            console.error(`Failed to delete distribution ${distributionId}:`, error);
            throw error;
        }
    }

    /**
     * Delete all synced distributions and their items for a commercial
     * @param commercialUsername Commercial username
     */
    async deleteSyncedDistributions(commercialUsername: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        try {
            const deleteSet: capSQLiteSet[] = [
                {
                    statement: `DELETE FROM distribution_items WHERE distributionId IN (SELECT id FROM distributions WHERE isSync = 1 AND commercialId = ?)`,
                    values: [commercialUsername]
                },
                {
                    statement: `DELETE FROM distributions WHERE isSync = 1 AND commercialId = ?`,
                    values: [commercialUsername]
                }
            ];

            await this.databaseService.executeSet(deleteSet);
            console.log(`Successfully deleted synced distributions and their items for ${commercialUsername}.`);
        } catch (error) {
            console.error(`Failed to delete synced distributions for commercial ${commercialUsername}:`, error);
            throw error;
        }
    }

}
