import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { CommercialStockItem, CommercialStockItemDto } from '../../models/commercial-stock-item.model';
import { LoggerService } from '../services/logger.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class CommercialStockRepository {

  constructor(
    private db: DatabaseService,
    private log: LoggerService
  ) { }

  async saveWithCommercialUsername(items: CommercialStockItemDto[], username: string): Promise<void> {
    try {
      this.log.log(`[CommercialStockRepository] Starting saveWithCommercialUsername for ${username} with ${items.length} items.`);

      const batch: capSQLiteSet[] = [];

      // 1. Delete existing stock for this user
      batch.push({
        statement: 'DELETE FROM commercial_stock_items WHERE commercialUsername = ?',
        values: [username]
      });

      // 2. Prepare insert statements
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const timestamp = now.toISOString();

      const insertSql = `INSERT INTO commercial_stock_items (articleId, quantityRemaining, quantityTaken, quantitySold, quantityReturned, commercialUsername, month, year, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      for (const item of items) {
        batch.push({
          statement: insertSql,
          values: [
            String(item.articleId), // Ensure articleId is string for TEXT column
            item.quantityRemaining,
            item.quantityTaken || 0,
            item.quantitySold || 0,
            item.quantityReturned || 0,
            username,
            item.month || currentMonth,
            item.year || currentYear,
            timestamp
          ]
        });
      }

      // 3. Execute the batch transaction
      await this.db.executeSet(batch);

      this.log.log(`[CommercialStockRepository] Successfully executed batch transaction. Saved ${items.length} items for ${username}`);

      // Verify immediately
      const check = await this.db.query('SELECT count(*) as count FROM commercial_stock_items WHERE commercialUsername = ?', [username]);
      const count = check?.values?.[0]?.count || 0;
      this.log.log(`[CommercialStockRepository] Immediate verification: ${count} items found.`);

    } catch (error) {
      this.log.error('[CommercialStockRepository] Error saving stock items', error);
      throw error;
    }
  }

  async getAvailableStock(username: string): Promise<CommercialStockItem[]> {
    try {
      this.log.log(`[CommercialStockRepository] Getting available stock for ${username}`);

      // DEBUG: Check if any data exists at all for this user
      const checkAll = await this.db.query('SELECT count(*) as count FROM commercial_stock_items WHERE commercialUsername = ?', [username]);
      let totalCount = 0;
      if (checkAll && checkAll.values && checkAll.values.length > 0) {
        totalCount = checkAll.values[0].count;
      }
      this.log.log(`[CommercialStockRepository] Total items in DB for ${username}: ${totalCount}`);

      const result = await this.db.query(
        'SELECT * FROM commercial_stock_items WHERE commercialUsername = ? AND quantityRemaining > 0',
        [username]
      );

      const items: CommercialStockItem[] = [];
      if (result && result.values) {
        for (const row of result.values) {
          items.push(row);
        }
      }

      this.log.log(`[CommercialStockRepository] Found ${items.length} available items for ${username}`);
      return items;
    } catch (error) {
      this.log.error('[CommercialStockRepository] Error getting available stock', error);
      return [];
    }
  }

  async updateStockQuantity(articleId: string, username: string, quantityChange: number): Promise<void> {
    try {
      let sql = `UPDATE commercial_stock_items SET quantityRemaining = quantityRemaining + ?`;
      const params: any[] = [quantityChange];

      if (quantityChange < 0) {
        sql += `, quantitySold = quantitySold + ?`;
        params.push(Math.abs(quantityChange));
      }

      sql += ` WHERE articleId = ? AND commercialUsername = ?`;
      params.push(String(articleId), username); // Ensure articleId is string

      // UPDATE is not a query, so executeSql (which calls run) is correct here
      await this.db.executeSql(sql, params);
    } catch (error) {
      this.log.error('[CommercialStockRepository] Error updating stock quantity', error);
      throw error;
    }
  }

  /**
   * Calculate total value of remaining stock for a commercial
   * 
   * @param username Commercial username
   * @returns Total value (quantityRemaining * creditSalePrice)
   */
  async getTotalStockValue(username: string): Promise<number> {
    try {
      // Join with articles table to get creditSalePrice
      const query = `
              SELECT COALESCE(SUM(s.quantityRemaining * a.creditSalePrice), 0) as totalValue
              FROM commercial_stock_items s
              JOIN articles a ON s.articleId = a.id
              WHERE s.commercialUsername = ?
          `;
      const result = await this.db.query(query, [username]);
      return result?.values?.[0]?.totalValue || 0;
    } catch (error) {
      this.log.error('[CommercialStockRepository] Error calculating total stock value', error);
      return 0;
    }
  }

  /**
   * Find available articles (with stock) paginated
   * 
   * @param username Commercial username
   * @param page Page index (0-based)
   * @param size Page size
   * @param filters Optional filters (searchQuery)
   * @returns Page of Articles with stockQuantity populated
   */
  async findAvailableArticlesPaginated(
    username: string,
    page: number,
    size: number,
    filters?: { searchQuery?: string }
  ): Promise<{ content: any[], totalElements: number, totalPages: number }> {
    try {
      const offset = page * size;
      const params: any[] = [username];

      let baseQuery = `
        FROM commercial_stock_items s
        JOIN articles a ON s.articleId = a.id
        WHERE s.commercialUsername = ? AND s.quantityRemaining > 0
      `;

      if (filters?.searchQuery) {
        baseQuery += ` AND (LOWER(a.name) LIKE ? OR LOWER(a.reference) LIKE ?)`;
        const term = `%${filters.searchQuery.toLowerCase()}%`;
        params.push(term, term);
      }

      // Count Query
      const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
      // Log count query for debugging
      // console.log('[CommercialStockRepository] Count Query:', countQuery, params);

      const countResult = await this.db.query(countQuery, params);
      const totalElements = countResult?.values?.[0]?.total || 0;
      const totalPages = Math.ceil(totalElements / size);

      // Data Query
      const dataQuery = `
        SELECT a.*, s.quantityRemaining as stockQuantity 
        ${baseQuery}
        ORDER BY a.name ASC
        LIMIT ? OFFSET ?
      `;

      const dataParams = [...params, size, offset];
      // Log data query for debugging
      // console.log('[CommercialStockRepository] Data Query:', dataQuery, dataParams);

      const dataResult = await this.db.query(dataQuery, dataParams);
      const content = dataResult?.values || [];

      // Parse JSON fields if necessary (like existing dbService does for Articles)
      // Usually dbService handles this if using getArticles, but here we do raw query.
      // We might need to parse 'image', 'packaging', etc if they are JSON strings.
      // But typically SQLite plugin returns columns as is. If Article entity has special types, we might need mapping.
      // For now, assuming direct mapping is fine or handled by consumer.
      // Actually, 'isSync', 'isLocal' are integers (0/1) in SQLite usually?
      // Let's ensure basic boolean mapping if needed, but often JS treats 1 as true-ish.

      return {
        content,
        totalElements,
        totalPages
      };

    } catch (error) {
      this.log.error('[CommercialStockRepository] Error finding available articles paginated', error);
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  }
}
