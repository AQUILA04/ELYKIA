import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { StockOutput } from '../../models/stock-output.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';
import { StockOutputMapper } from '../../shared/mapper/stock-outpout.mapper';

@Injectable({
    providedIn: 'root'
})
export class StockOutputRepository extends BaseRepository<StockOutput, string> {
    protected tableName = 'stock_outputs';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: StockOutput[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = ['id', 'reference', 'status', 'updatable', 'totalAmount', 'createdAt', 'commercialId'];
        const existingRows = await this.databaseService.query('SELECT id, syncHash FROM stock_outputs');
        const existingOutputMap = new Map<string, string>(
            existingRows.values?.map((row: { id: string | number; syncHash: string }) => [String(row.id), row.syncHash]) ?? []
        );

        const outputsToInsert: capSQLiteSet[] = [];
        const outputsToUpdate: capSQLiteSet[] = [];
        const allItemsToInsert: capSQLiteSet[] = [];
        const outputIdsToClearItems: string[] = [];
        const now = new Date().toISOString();

        for (const so of entities) {
            const soLocal = StockOutputMapper.toLocal(so);
            const soIdStr = String(soLocal.id);
            if (!soIdStr) { continue; }

            const newHash = this.generateHash(soLocal, keysToInclude);
            const isExisting = existingOutputMap.has(soIdStr);
            const needsUpdate = isExisting && existingOutputMap.get(soIdStr) !== newHash;

            if (!isExisting || needsUpdate) {
                if (needsUpdate) {
                    outputIdsToClearItems.push(soIdStr);
                    const updateParams = [
                        soLocal.reference ?? null,
                        soLocal.status ?? null,
                        soLocal.updatable ? 1 : 0,
                        soLocal.totalAmount ?? 0,
                        soLocal.createdAt ?? now,
                        soLocal.commercialId ?? null,
                        1, now, newHash, soIdStr
                    ];
                    const sql = `UPDATE stock_outputs SET reference = ?, status = ?, updatable = ?, totalAmount = ?, createdAt = ?, commercialId = ?, isSync = ?, syncDate = ?, syncHash = ? WHERE id = ?`;
                    outputsToUpdate.push({ statement: sql, values: updateParams });
                } else {
                    const insertParams = [
                        soIdStr,
                        soLocal.reference ?? null,
                        soLocal.status ?? null,
                        soLocal.updatable ? 1 : 0,
                        soLocal.totalAmount ?? 0,
                        soLocal.createdAt ?? now,
                        soLocal.commercialId ?? null,
                        1, now, newHash
                    ];
                    const sql = `INSERT INTO stock_outputs (id, reference, status, updatable, totalAmount, createdAt, commercialId, isSync, syncDate, syncHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    outputsToInsert.push({ statement: sql, values: insertParams });
                }

                for (const item of soLocal?.items || []) {
                    const sql = `INSERT INTO stock_output_items (id, stockOutputId, articleId, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?)`;
                    allItemsToInsert.push({
                        statement: sql,
                        values: [
                            item.id ?? null,
                            item.stockOutputId ?? soIdStr,
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
            if (outputIdsToClearItems.length > 0) {
                const placeholders = outputIdsToClearItems.map(() => '?').join(',');
                const sql = `DELETE FROM stock_output_items WHERE stockOutputId IN (${placeholders})`;
                await this.databaseService['db'].run(sql, outputIdsToClearItems);
            }

            if (outputsToUpdate.length > 0) {
                await this.databaseService.executeSet(outputsToUpdate);
            }

            if (outputsToInsert.length > 0) {
                await this.databaseService.executeSet(outputsToInsert);
            }

            if (allItemsToInsert.length > 0) {
                await this.databaseService.executeSet(allItemsToInsert);
            }

        } catch (error) {
            console.error('Failed to save stock outputs in repository.', error);
            throw error;
        }
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get stock outputs filtered by status
     * @param status Status to filter by
     * @returns Array of stock outputs with the specified status
     */
    async getByStatus(status: string): Promise<StockOutput[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        const sql = `SELECT * FROM stock_outputs WHERE status = ?`;
        const ret = await this.databaseService.query(sql, [status]);
        return ret.values || [];
    }

    /**
     * Get all stock output items
     * @returns Array of all stock output items
     */
    async getAllItems(): Promise<any[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        const ret = await this.databaseService.query('SELECT * FROM stock_output_items');
        return ret.values || [];
    }

    /**
     * Get items for a specific stock output
     * @param stockOutputId ID of the stock output
     * @returns Array of items for the specified stock output
     */
    async getItemsByStockId(stockOutputId: string): Promise<any[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        const sql = `SELECT * FROM stock_output_items WHERE stockOutputId = ?`;
        const ret = await this.databaseService.query(sql, [stockOutputId]);
        return ret.values || [];
    }

}
