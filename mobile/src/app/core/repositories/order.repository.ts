import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Order } from '../../models/order.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class OrderRepository extends BaseRepository<Order, string> {
    protected tableName = 'orders';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Order[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        if (!entities || entities.length === 0) {
            return;
        }

        const keysToInclude = ['id', 'reference', 'totalAmount', 'status', 'clientId', 'commercialId'];
        const existingRows = await this.databaseService.query('SELECT id, syncHash FROM orders');

        const existingOrderMap = new Map<string, string>(
            existingRows.values?.map((row: any) => [String(row.id), row.syncHash]) ?? []
        );

        const ordersToUpdate: capSQLiteSet[] = [];
        const ordersToInsert: capSQLiteSet[] = [];
        const allItemsToInsert: capSQLiteSet[] = [];
        const orderIdsToClearItems: string[] = [];
        const now = new Date().toISOString();

        for (const order of entities) {
            const orderIdStr = String(order.id);
            if (!orderIdStr) { continue; }

            const newHash = this.generateHash(order, keysToInclude);
            const isExisting = existingOrderMap.has(orderIdStr);
            const needsUpdate = isExisting && existingOrderMap.get(orderIdStr) !== newHash;

            if (isExisting && !needsUpdate) {
                continue;
            }

            if (needsUpdate) {
                orderIdsToClearItems.push(orderIdStr);
            }

            if (needsUpdate) {
                const sql = `UPDATE orders SET reference=?, totalAmount=?, advance=?, remainingAmount=?, dailyPayment=?, startDate=?, endDate=?, status=?, clientId=?, commercialId=?, isLocal=?, isSync=?, syncDate=?, createdAt=?, syncHash=?, articleCount=? WHERE id=?`;
                ordersToUpdate.push({
                    statement: sql,
                    values: [
                        order.reference ?? null,
                        order.totalAmount ?? 0,
                        order.advance ?? 0,
                        order.remainingAmount ?? order.totalAmount ?? 0,
                        order.dailyPayment ?? 0,
                        order.startDate ?? null,
                        order.endDate ?? null,
                        order.status ?? null,
                        order.clientId ?? null,
                        order.commercialId ?? null,
                        order.isLocal ? 1 : 0,
                        order.isSync ? 1 : 0,
                        now,
                        order.createdAt ?? now,
                        newHash,
                        order.articleCount ?? 0,
                        orderIdStr
                    ]
                });
            } else if (!isExisting) {
                const sql = `INSERT INTO orders (id, reference, totalAmount, advance, remainingAmount, dailyPayment, startDate, endDate, status, clientId, commercialId, isLocal, isSync, syncDate, createdAt, syncHash, articleCount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                ordersToInsert.push({
                    statement: sql,
                    values: [
                        orderIdStr,
                        order.reference ?? null,
                        order.totalAmount ?? 0,
                        order.advance ?? 0,
                        order.remainingAmount ?? order.totalAmount ?? 0,
                        order.dailyPayment ?? 0,
                        order.startDate ?? null,
                        order.endDate ?? null,
                        order.status ?? null,
                        order.clientId ?? null,
                        order.commercialId ?? null,
                        order.isLocal ? 1 : 0,
                        order.isSync ? 1 : 0,
                        now,
                        order.createdAt ?? now,
                        newHash,
                        order.articleCount ?? 0
                    ]
                });
            }

            if (order.items && order.items.length > 0) {
                const sql = `INSERT INTO order_items (id, orderId, articleId, quantity, unitPrice, totalPrice, articleName) VALUES (?,?,?,?,?,?,?)`;
                for (const item of order.items) {
                    allItemsToInsert.push({
                        statement: sql,
                        values: [
                            item.id ?? this.databaseService['generateUuid'](),
                            orderIdStr,
                            item.articleId ?? null,
                            item.quantity ?? 0,
                            item.unitPrice ?? 0,
                            item.totalPrice ?? 0,
                            item.articleName ?? null
                        ]
                    });
                }
            }
        }

        try {
            if (orderIdsToClearItems.length > 0) {
                const placeholders = orderIdsToClearItems.map(() => '?').join(',');
                const sql = `DELETE FROM order_items WHERE orderId IN (${placeholders})`;
                await this.databaseService['db'].run(sql, orderIdsToClearItems);
            }

            if (ordersToUpdate.length > 0) {
                await this.databaseService.executeSet(ordersToUpdate);
            }

            if (ordersToInsert.length > 0) {
                await this.databaseService.executeSet(ordersToInsert);
            }

            if (allItemsToInsert.length > 0) {
                await this.databaseService.executeSet(allItemsToInsert);
            }

        } catch (error) {
            console.error('Failed to save orders and items in repository.', error);
            throw error;
        }
    }

    /**
     * Get unsynced orders with pagination
     * @param commercialUsername Commercial username
     * @param limit Max number of items
     * @param offset Offset
     */
    override async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<Order[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `SELECT * FROM orders WHERE isSync = 0 AND isLocal = 1 AND commercialId = ? ORDER BY createdAt ASC LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [commercialUsername, limit, offset]);

        return (result.values || []).map((row: any) => this.mapRowToOrder(row));
    }

    async markAsSynced(localId: string, serverId: string): Promise<void> {
        if (!this.databaseService['db'] || localId === serverId) return;
        const updateSet = [
            { statement: `UPDATE order_items SET orderId = ? WHERE orderId = ?`, values: [serverId, localId] },
            { statement: `UPDATE orders SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`, values: [serverId, localId] }
        ];
        await this.databaseService.executeSet(updateSet);
    }

    private mapRowToOrder(row: any): Order {
        return {
            ...row,
            isLocal: row.isLocal === 1,
            isSync: row.isSync === 1,
            // Add other boolean mappings if needed
        } as Order;
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get all order items
     * @returns Array of all order items
     */
    async getAllItems(): Promise<any[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        try {
            const query = `SELECT * FROM order_items`;
            const result = await this.databaseService.query(query);
            return result.values || [];
        } catch (error) {
            console.error('Error getting all order items:', error);
            throw error;
        }
    }

    /**
     * Get items for a specific order
     * @param orderId ID of the order
     * @returns Array of items for the specified order
     */
    async getItemsForOrder(orderId: string): Promise<any[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        try {
            const query = `SELECT * FROM order_items WHERE orderId = ?`;
            const result = await this.databaseService.query(query, [orderId]);
            return result.values || [];
        } catch (error) {
            console.error('Error getting order items:', error);
            throw error;
        }
    }

    /**
     * Save order items to local database
     * Clears existing items and inserts new ones
     * @param items List of items to save
     */
    async saveOrderItems(items: any[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        if (!items || items.length === 0) {
            console.log('No order items to save.');
            return;
        }

        try {
            await this.databaseService.execute('BEGIN TRANSACTION;');

            // Clear existing items first
            await this.databaseService.execute('DELETE FROM order_items');

            const sql = `
          INSERT INTO order_items (
            id, orderId, articleId, quantity, unitPrice, totalPrice, articleName
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

            const itemsToInsert: capSQLiteSet[] = items.map(item => ({
                statement: sql,
                values: [
                    item.id,
                    item.orderId,
                    item.articleId,
                    item.quantity,
                    item.unitPrice,
                    item.totalPrice,
                    item.articleName || null
                ]
            }));

            await this.databaseService.executeSet(itemsToInsert);

            await this.databaseService.execute('COMMIT;');
            console.log(`Successfully saved ${items.length} order items.`);
        } catch (error) {
            console.error('Failed to save order items in repository.', error);
            await this.databaseService.execute('ROLLBACK;');
            throw error;
        }
    }

    /**
     * Delete an order and its items
     * @param orderId ID of the order to delete
     */
    async deleteOrder(orderId: string): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        try {
            const deleteSet: capSQLiteSet[] = [
                {
                    statement: `DELETE FROM order_items WHERE orderId = ?`,
                    values: [orderId]
                },
                {
                    statement: `DELETE FROM orders WHERE id = ?`,
                    values: [orderId]
                }
            ];

            await this.databaseService.executeSet(deleteSet);
            console.log(`Successfully deleted order ${orderId} and its items.`);
        } catch (error) {
            console.error(`Failed to delete order ${orderId}:`, error);
            throw error;
        }
    }

}
