import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { DatabaseService } from '../services/database.service';
import { TontineStock } from '../../models/tontine.model';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class TontineStockRepository extends BaseRepository<TontineStock, string> {
    protected tableName = 'tontine_stocks';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: TontineStock[]): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        if (!entities.length) return;

        const query = `
            INSERT OR REPLACE INTO tontine_stocks (
                id, commercial, creditId, articleId, articleName, unitPrice, 
                totalQuantity, availableQuantity, distributedQuantity, year, tontineSessionId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const set: capSQLiteSet[] = entities.map(stock => ({
            statement: query,
            values: [
                stock.id,
                stock.commercial,
                stock.creditId || null,
                stock.articleId,
                stock.articleName || null,
                stock.unitPrice,
                stock.totalQuantity,
                stock.availableQuantity,
                stock.distributedQuantity,
                stock.year,
                stock.tontineSessionId
            ]
        }));

        await this.databaseService.executeSet(set);
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get stocks for a specific commercial and session
     */
    async getByCommercialAndSession(commercial: string, sessionId: string): Promise<TontineStock[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        
        const query = `
            SELECT * FROM tontine_stocks 
            WHERE commercial = ? AND tontineSessionId = ?
            ORDER BY articleName
        `;
        
        const result = await this.databaseService.query(query, [commercial, sessionId]);
        return result.values || [];
    }

    /**
     * Get available stocks (availableQuantity > 0)
     */
    async getAvailableStocks(commercial: string, sessionId: string): Promise<TontineStock[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        
        const query = `
            SELECT * FROM tontine_stocks 
            WHERE commercial = ? AND tontineSessionId = ? AND availableQuantity > 0
            ORDER BY articleName
        `;
        
        const result = await this.databaseService.query(query, [commercial, sessionId]);
        return result.values || [];
    }

    /**
     * Get stock by article
     */
    async getByArticle(commercial: string, sessionId: string, articleId: string): Promise<TontineStock | null> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        
        const query = `
            SELECT * FROM tontine_stocks 
            WHERE commercial = ? AND tontineSessionId = ? AND articleId = ?
        `;
        
        const result = await this.databaseService.query(query, [commercial, sessionId, articleId]);
        return result.values && result.values.length > 0 ? result.values[0] : null;
    }

    /**
     * Update available quantity after distribution
     */
    async updateQuantities(stockId: string, distributedQty: number): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        
        const query = `
            UPDATE tontine_stocks 
            SET availableQuantity = availableQuantity - ?,
                distributedQuantity = distributedQuantity + ?
            WHERE id = ?
        `;
        
        await this.databaseService.execute(query, [distributedQty, distributedQty, stockId]);
    }
}
