import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { CommercialStockItem } from '../../models/commercial-stock-item.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class CommercialStockRepository extends BaseRepository<CommercialStockItem, number> {
    protected tableName = 'commercial_stock_items';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: CommercialStockItem[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const statements: capSQLiteSet[] = [];
        
        for (const item of entities) {
            const query = `
                INSERT OR REPLACE INTO commercial_stock_items 
                (articleId, articleName, commercialName, sellingPrice, creditSalePrice, quantityRemaining, commercialUsername, lastUpdated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            statements.push({
                statement: query,
                values: [
                    item.articleId,
                    item.articleName,
                    item.commercialName,
                    item.sellingPrice,
                    item.creditSalePrice,
                    item.quantityRemaining,
                    '', // commercialUsername will be set by service
                    new Date().toISOString()
                ]
            });
        }
        
        if (statements.length > 0) {
            await this.databaseService.executeSet(statements);
            console.log(`Saved ${statements.length} commercial stock items`);
        }
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get all stock items for a specific commercial user
     * @param commercialUsername Username of the commercial
     * @returns Array of stock items for the commercial
     */
    async findByCommercialUsername(commercialUsername: string): Promise<CommercialStockItem[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        
        const query = `SELECT * FROM commercial_stock_items WHERE commercialUsername = ?`;
        const result = await this.databaseService.query(query, [commercialUsername]);
        return result.values || [];
    }

    /**
     * Get available stock items (quantity > 0) for a commercial user
     * @param commercialUsername Username of the commercial
     * @returns Array of available stock items
     */
    async findAvailableByCommercialUsername(commercialUsername: string): Promise<CommercialStockItem[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        
        const query = `
            SELECT * FROM commercial_stock_items 
            WHERE commercialUsername = ? AND quantityRemaining > 0
            ORDER BY articleName ASC
        `;
        const result = await this.databaseService.query(query, [commercialUsername]);
        return result.values || [];
    }

    /**
     * Get stock item by article ID
     * @param articleId ID of the article
     * @returns Stock item or null if not found
     */
    async findByArticleId(articleId: number): Promise<CommercialStockItem | null> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return null;
        }
        
        const query = `SELECT * FROM commercial_stock_items WHERE articleId = ?`;
        const result = await this.databaseService.query(query, [articleId]);
        
        if (result.values && result.values.length > 0) {
            return result.values[0] as CommercialStockItem;
        }
        return null;
    }

    // ==================== SPECIFIC UPDATE METHODS ====================

    /**
     * Update the quantity of a specific article
     * @param articleId ID of the article
     * @param newQuantity New quantity value
     */
    async updateQuantity(articleId: number, newQuantity: number): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        
        const query = `
            UPDATE commercial_stock_items 
            SET quantityRemaining = ?, lastUpdated = ? 
            WHERE articleId = ?
        `;
        
        await this.databaseService.execute(query, [newQuantity, new Date().toISOString(), articleId]);
    }

    /**
     * Reduce the quantity of an article after distribution
     * @param articleId ID of the article
     * @param quantityUsed Quantity to reduce
     * @throws Error if insufficient stock
     */
    async reduceQuantity(articleId: number, quantityUsed: number): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        
        const query = `
            UPDATE commercial_stock_items 
            SET quantityRemaining = quantityRemaining - ?, lastUpdated = ? 
            WHERE articleId = ? AND quantityRemaining >= ?
        `;
        
        const result = await this.databaseService.execute(query, [
            quantityUsed, 
            new Date().toISOString(), 
            articleId, 
            quantityUsed
        ]);
        
        if (result.changes === 0) {
            throw new Error(`Insufficient stock for article ${articleId}. Requested: ${quantityUsed}`);
        }
    }

    /**
     * Reduce quantities for multiple articles in a single transaction
     * @param articles Array of articles with their quantities to reduce
     * @throws Error if any article has insufficient stock
     */
    async reduceQuantities(articles: Array<{articleId: number, quantity: number}>): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        // First, check availability for all articles
        const isAvailable = await this.checkStockAvailability(articles);
        if (!isAvailable) {
            throw new Error('Insufficient stock for one or more articles');
        }

        // If all articles are available, reduce quantities
        const statements: capSQLiteSet[] = [];
        const now = new Date().toISOString();

        for (const article of articles) {
            const query = `
                UPDATE commercial_stock_items 
                SET quantityRemaining = quantityRemaining - ?, lastUpdated = ? 
                WHERE articleId = ?
            `;
            
            statements.push({
                statement: query,
                values: [article.quantity, now, article.articleId]
            });
        }

        if (statements.length > 0) {
            await this.databaseService.executeSet(statements);
        }
    }

    // ==================== VALIDATION METHODS ====================

    /**
     * Check if articles are available in sufficient quantities
     * @param articles Array of articles with required quantities
     * @returns true if all articles are available, false otherwise
     */
    async checkStockAvailability(articles: Array<{articleId: number, quantity: number}>): Promise<boolean> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        
        for (const article of articles) {
            const query = `SELECT quantityRemaining FROM commercial_stock_items WHERE articleId = ?`;
            const result = await this.databaseService.query(query, [article.articleId]);
            
            if (!result.values || result.values.length === 0) {
                return false; // Article not found
            }
            
            const availableQuantity = result.values[0].quantityRemaining;
            if (availableQuantity < article.quantity) {
                return false; // Insufficient stock
            }
        }
        
        return true;
    }

    /**
     * Get detailed stock availability information
     * @param articles Array of articles with required quantities
     * @returns Array with availability details for each article
     */
    async getStockAvailabilityDetails(articles: Array<{articleId: number, quantity: number}>): Promise<Array<{
        articleId: number;
        requested: number;
        available: number;
        sufficient: boolean;
        articleName?: string;
    }>> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        
        const details = [];
        
        for (const article of articles) {
            const query = `SELECT quantityRemaining, articleName FROM commercial_stock_items WHERE articleId = ?`;
            const result = await this.databaseService.query(query, [article.articleId]);
            
            if (result.values && result.values.length > 0) {
                const available = result.values[0].quantityRemaining;
                details.push({
                    articleId: article.articleId,
                    requested: article.quantity,
                    available: available,
                    sufficient: available >= article.quantity,
                    articleName: result.values[0].articleName
                });
            } else {
                details.push({
                    articleId: article.articleId,
                    requested: article.quantity,
                    available: 0,
                    sufficient: false
                });
            }
        }
        
        return details;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Save stock items with commercial username
     * @param stockItems Array of stock items
     * @param commercialUsername Username to associate with the items
     */
    async saveWithCommercialUsername(stockItems: CommercialStockItem[], commercialUsername: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const statements: capSQLiteSet[] = [];
        
        for (const item of stockItems) {
            const query = `
                INSERT OR REPLACE INTO commercial_stock_items 
                (articleId, articleName, commercialName, sellingPrice, creditSalePrice, quantityRemaining, commercialUsername, lastUpdated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            statements.push({
                statement: query,
                values: [
                    item.articleId,
                    item.articleName,
                    item.commercialName,
                    item.sellingPrice,
                    item.creditSalePrice,
                    item.quantityRemaining,
                    commercialUsername,
                    new Date().toISOString()
                ]
            });
        }
        
        if (statements.length > 0) {
            await this.databaseService.executeSet(statements);
            console.log(`Saved ${statements.length} commercial stock items for ${commercialUsername}`);
        }
    }

    /**
     * Clear all stock items for a commercial user
     * @param commercialUsername Username of the commercial
     */
    async clearByCommercialUsername(commercialUsername: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        
        const query = `DELETE FROM commercial_stock_items WHERE commercialUsername = ?`;
        await this.databaseService.execute(query, [commercialUsername]);
    }
}