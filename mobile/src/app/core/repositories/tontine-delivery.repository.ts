import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { DatabaseService } from '../services/database.service';
import { TontineDelivery } from '../../models/tontine.model';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class TontineDeliveryRepository extends BaseRepository<TontineDelivery, string> {
    protected tableName = 'tontine_deliveries';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    override async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<TontineDelivery[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const sql = `SELECT * FROM tontine_deliveries WHERE isSync = 0 AND isLocal = 1 AND commercialUsername = ? LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [commercialUsername, limit, offset]);
        return (result.values || []).map((row: any) => ({ ...row, isLocal: row.isLocal === 1, isSync: row.isSync === 1 }));
    }

    async markAsSynced(localId: string, serverId: string): Promise<void> {
        if (!this.databaseService['db'] || localId === serverId) return;
        const updateSet = [
            { statement: `UPDATE tontine_delivery_items SET tontineDeliveryId = ? WHERE tontineDeliveryId = ?`, values: [serverId, localId] },
            { statement: `UPDATE tontine_deliveries SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`, values: [serverId, localId] }
        ];
        await this.databaseService.executeSet(updateSet);
    }

    async saveAll(entities: TontineDelivery[]): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        if (!entities.length) return;

        const queryDelivery = `
      INSERT OR REPLACE INTO tontine_deliveries(
          id, tontineMemberId, commercialUsername, requestDate, deliveryDate, totalAmount, status, isLocal, isSync, syncDate, syncHash
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

        const queryItems = `
      INSERT OR REPLACE INTO tontine_delivery_items(
            id, tontineDeliveryId, articleId, quantity, unitPrice, totalPrice
          ) VALUES(?, ?, ?, ?, ?, ?)
            `;

        const set: capSQLiteSet[] = [];

        for (const d of entities) {
            const delivery = d as any;
            set.push({
                statement: queryDelivery,
                values: [
                    delivery.id, delivery.tontineMemberId, delivery.commercialUsername, delivery.requestDate, delivery.deliveryDate, delivery.totalAmount, delivery.status,
                    delivery.isLocal ? 1 : 0, delivery.isSync ? 1 : 0, delivery.syncDate || new Date().toISOString(), delivery.syncHash
                ]
            });

            if (delivery.items && delivery.items.length) {
                for (const item of delivery.items) {
                    set.push({
                        statement: queryItems,
                        values: [
                            item.id, delivery.id, item.articleId, item.quantity, item.unitPrice, item.totalPrice
                        ]
                    });
                }
            }
        }

        await this.databaseService.executeSet(set);
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get deliveries for a specific member and commercial
     * @param memberId ID of the tontine member
     * @param commercialUsername Username of the commercial
     * @returns Array of deliveries with their items
     */
    async getByMemberAndCommercial(memberId: string, commercialUsername: string): Promise<TontineDelivery[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');

        // Get deliveries
        const deliveriesResult = await this.databaseService.query('SELECT * FROM tontine_deliveries WHERE tontineMemberId = ? AND commercialUsername = ?', [memberId, commercialUsername]);
        const deliveries = deliveriesResult.values || [];

        // Get items for each delivery with article names via JOIN
        for (const d of deliveries) {
            const itemsQuery = `
                SELECT
                    tdi.*,
                    a.name as articleName,
                    a.commercialName as articleCommercialName
                FROM tontine_delivery_items tdi
                LEFT JOIN articles a ON tdi.articleId = a.id
                WHERE tdi.tontineDeliveryId = ?
            `;
            const itemsResult = await this.databaseService.query(itemsQuery, [d.id]);

            d.items = (itemsResult.values || []).map((item: any) => ({
                ...item,
                articleName: item.articleCommercialName || item.articleName || 'Article inconnu'
            }));
        }

        return deliveries;
    }

    async getItems(deliveryId: string): Promise<any[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const sql = `SELECT * FROM tontine_delivery_items WHERE tontineDeliveryId = ?`;
        const result = await this.databaseService.query(sql, [deliveryId]);
        return result.values || [];
    }

    /**
     * Get tontine deliveries created on a specific date for a commercial
     * @param commercialUsername Commercial username
     * @param date Date string (YYYY-MM-DD)
     * @returns Array of tontine deliveries with member names
     */
    async findByCommercialAndDate(commercialUsername: string, date: string): Promise<any[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const sql = `
            SELECT td.*, c.fullName as clientName
            FROM tontine_deliveries td
            LEFT JOIN tontine_members tm ON td.tontineMemberId = tm.id
            LEFT JOIN clients c ON tm.clientId = c.id
            WHERE td.commercialUsername = ? AND td.requestDate LIKE ?
        `;
        const result = await this.databaseService.query(sql, [commercialUsername, `${date}%`]);
        return (result.values || []).map((row: any) => ({
            ...row,
            isLocal: row.isLocal === 1,
            isSync: row.isSync === 1,
            clientName: row.clientName
        }));
    }
}
