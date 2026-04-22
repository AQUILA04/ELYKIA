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
                const sql = `UPDATE distributions SET reference=?, creditId=?, totalAmount=?, dailyPayment=?, startDate=?, endDate=?, status=?, clientId=?, commercialId=?, isLocal=?, isSync=?, syncDate=?, createdAt=?, syncHash=?, articleCount=?, remainingAmount=?, paidAmount=?, advance=? WHERE id=?`;
                distributionsToUpdate.push({
                    statement: sql,
                    values: [
                        localDist.reference ?? null, localDist.creditId ?? null, localDist.totalAmount ?? 0,
                        localDist.dailyPayment ?? 0, localDist.startDate ?? null, localDist.endDate ?? null,
                        localDist.status ?? null, localDist.clientId ?? null, localDist.commercialId ?? null,
                        localDist.isLocal ? 1 : 0, localDist.isSync ? 1 : 0, now,
                        localDist.createdAt ?? now, newHash, localDist.articleCount ?? 0,
                        localDist.remainingAmount ?? localDist.totalAmount ?? 0,
                        localDist.paidAmount ?? 0, localDist.advance ?? 0, distIdStr
                    ]
                });
            } else if (!isExisting) {
                const sql = `INSERT INTO distributions (id, reference, creditId, totalAmount, dailyPayment, startDate, endDate, status, clientId, commercialId, isLocal, isSync, syncDate, createdAt, syncHash, articleCount, remainingAmount, paidAmount, advance) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                distributionsToInsert.push({
                    statement: sql,
                    values: [
                        distIdStr, localDist.reference ?? null, localDist.creditId ?? null, localDist.totalAmount ?? 0,
                        localDist.dailyPayment ?? 0, localDist.startDate ?? null, localDist.endDate ?? null,
                        localDist.status ?? null, localDist.clientId ?? null, localDist.commercialId ?? null,
                        localDist.isLocal ? 1 : 0, localDist.isSync ? 1 : 0, now,
                        localDist.createdAt ?? now, newHash, localDist.articleCount ?? 0,
                        localDist.remainingAmount ?? localDist.totalAmount ?? 0,
                        localDist.paidAmount ?? 0, localDist.advance ?? 0
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
    override async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<Distribution[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `SELECT * FROM distributions WHERE isSync = 0 AND isLocal = 1 AND commercialId = ? ORDER BY createdAt ASC LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [commercialUsername, limit, offset]);
        return (result.values || []).map((row: any) => this.mapRowToDistribution(row));
    }

    async markAsSynced(localId: string, serverId: string): Promise<void> {
        if (!this.databaseService['db'] || localId === serverId) return;
        const updateSet = [
            { statement: `UPDATE recoveries SET distributionId = ? WHERE distributionId = ?`, values: [serverId, localId] },
            { statement: `UPDATE distribution_items SET distributionId = ? WHERE distributionId = ?`, values: [serverId, localId] },
            { statement: `UPDATE distributions SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`, values: [serverId, localId] }
        ];
        await this.databaseService.executeSet(updateSet);
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
