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
        // This implements saveDistributions logic.
        // Note: DatabaseService also has saveDistributionsAndItems.
        // For a repository, save(Distribution) should probably save items too if they are present.
        // I will implement the logic from saveDistributionsAndItems as it is more complete for an aggregate.

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

            if (needsUpdate) {
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

            if (localDist.items && localDist.items.length > 0) {
                const sql = `INSERT INTO distribution_items (id, distributionId, articleId, quantity, unitPrice, totalPrice) VALUES (?,?,?,?,?,?)`;
                for (const item of localDist.items) {
                    allItemsToInsert.push({
                        statement: sql,
                        values: [
                            item.id ?? this.databaseService['generateUuid'](), // Accessing private or need helper
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
                await this.databaseService['db'].run(sql, distributionIdsToClearItems);
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
            console.error('Failed to save distributions and items in repository.', error);
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

        const keysToInclude = ['id', 'reference', 'totalAmount', 'dailyPayment', 'startDate', 'endDate', 'status'];
        const newSyncHash = this.generateHash(distribution, keysToInclude);
        const now = new Date().toISOString();

        const sql = `UPDATE distributions SET reference = ?, creditId = ?, totalAmount = ?, dailyPayment = ?, startDate = ?, endDate = ?, status = ?, clientId = ?, commercialId = ?, isLocal = ?, isSync = ?, syncDate = ?, createdAt = ?, syncHash = ?, articleCount = ?, remainingAmount = ?, paidAmount = ?, advance = ? WHERE id = ?`;

        const localDist = DistributionMapper.toLocal(distribution);

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

}
