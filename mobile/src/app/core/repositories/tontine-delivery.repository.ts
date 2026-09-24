import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { DatabaseService } from '../services/database.service';
import { TontineDelivery, TontineDeliveryStatus } from '../../models/tontine.model';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class TontineDeliveryRepository extends BaseRepository<TontineDelivery, string> {
    protected tableName = 'tontine_deliveries';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    private mapRow(row: any): TontineDelivery {
        return {
            ...row,
            isLocal: row.isLocal === 1 || row.isLocal === true,
            isSync: row.isSync === 1 || row.isSync === true,
            needsDeliverSync: row.needsDeliverSync === 1 || row.needsDeliverSync === true
        };
    }

    override async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<TontineDelivery[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const sql = `
            SELECT * FROM tontine_deliveries
            WHERE commercialUsername = ?
              AND (
                (isSync = 0 AND isLocal = 1)
                OR needsDeliverSync = 1
              )
            LIMIT ? OFFSET ?
        `;
        const result = await this.databaseService.query(sql, [commercialUsername, limit, offset]);
        return (result.values || []).map((row: any) => this.mapRow(row));
    }

    async markAsSynced(localId: string, serverId: string): Promise<void> {
        if (!this.databaseService['db'] || localId === serverId) {
            if (this.databaseService['db'] && localId === serverId) {
                await this.databaseService.execute(
                    `UPDATE tontine_deliveries SET isSync = 1, isLocal = 0, needsDeliverSync = 0, syncDate = datetime('now', 'localtime') WHERE id = ?`,
                    [localId]
                );
            }
            return;
        }
        const updateSet = [
            { statement: `UPDATE tontine_delivery_items SET tontineDeliveryId = ? WHERE tontineDeliveryId = ?`, values: [serverId, localId] },
            {
                statement: `UPDATE tontine_deliveries SET isSync = 1, isLocal = 0, needsDeliverSync = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`,
                values: [serverId, localId]
            }
        ];
        await this.databaseService.executeSet(updateSet);
    }

    /**
     * Deletes pending Local UUID rows that already have a synced server-id twin
     * (via id_mappings). Heals devices after hybrid sync that inserted a server
     * row without rewriting the local UUID.
     */
    async purgeSyncedOrphans(): Promise<number> {
        if (!this.databaseService['db']) {
            return 0;
        }

        const result = await this.databaseService.query(
            `SELECT td.id AS localId
             FROM tontine_deliveries td
             INNER JOIN id_mappings m
               ON m.localId = td.id AND m.entityType = 'tontine-delivery'
             WHERE td.isLocal = 1 AND td.isSync = 0
               AND EXISTS (
                 SELECT 1 FROM tontine_deliveries d2 WHERE d2.id = m.serverId
               )`
        );

        const orphanIds: string[] = (result.values || []).map((row: any) => String(row.localId));
        if (orphanIds.length === 0) {
            return 0;
        }

        for (const localId of orphanIds) {
            await this.databaseService.execute(
                `DELETE FROM tontine_delivery_items WHERE tontineDeliveryId = ?`,
                [localId]
            );
            await this.databaseService.execute(
                `DELETE FROM tontine_deliveries WHERE id = ? AND isLocal = 1 AND isSync = 0`,
                [localId]
            );
        }

        console.log(`[TontineDeliveryRepository] Purged ${orphanIds.length} synced orphan delivery(ies).`);
        return orphanIds.length;
    }

    async markDeliverSynced(deliveryId: string): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        await this.databaseService.execute(
            `UPDATE tontine_deliveries SET needsDeliverSync = 0, isSync = 1, syncDate = datetime('now', 'localtime') WHERE id = ?`,
            [deliveryId]
        );
    }

    async updateDeliveryStatusFields(
        deliveryId: string,
        fields: {
            status: TontineDeliveryStatus;
            deliveryDate?: string | null;
            needsDeliverSync?: boolean;
            isSync?: boolean;
            isLocal?: boolean;
            syncDate?: string | null;
        }
    ): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        await this.databaseService.execute(
            `UPDATE tontine_deliveries
             SET status = ?,
                 deliveryDate = ?,
                 needsDeliverSync = ?,
                 isSync = COALESCE(?, isSync),
                 isLocal = COALESCE(?, isLocal),
                 syncDate = COALESCE(?, syncDate)
             WHERE id = ?`,
            [
                fields.status,
                fields.deliveryDate ?? null,
                fields.needsDeliverSync ? 1 : 0,
                fields.isSync === undefined ? null : (fields.isSync ? 1 : 0),
                fields.isLocal === undefined ? null : (fields.isLocal ? 1 : 0),
                fields.syncDate === undefined ? null : fields.syncDate,
                deliveryId
            ]
        );
    }

    async saveAll(entities: TontineDelivery[]): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        if (!entities.length) return;

        const queryDelivery = `
      INSERT OR REPLACE INTO tontine_deliveries(
          id, reference, tontineMemberId, commercialUsername, requestDate, deliveryDate, totalAmount, status, isLocal, isSync, syncDate, syncHash, operationConsentCode, needsDeliverSync
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    delivery.id, delivery.reference || null, delivery.tontineMemberId, delivery.commercialUsername, delivery.requestDate, delivery.deliveryDate, delivery.totalAmount, delivery.status,
                    delivery.isLocal ? 1 : 0, delivery.isSync ? 1 : 0, delivery.syncDate || new Date().toISOString(), delivery.syncHash,
                    delivery.operationConsentCode || null,
                    delivery.needsDeliverSync ? 1 : 0
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

    async getByMemberAndCommercial(memberId: string, commercialUsername: string): Promise<TontineDelivery[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');

        const deliveriesResult = await this.databaseService.query('SELECT * FROM tontine_deliveries WHERE tontineMemberId = ? AND commercialUsername = ?', [memberId, commercialUsername]);
        const deliveries = (deliveriesResult.values || []).map((row: any) => this.mapRow(row));

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
            ...this.mapRow(row),
            clientName: row.clientName
        }));
    }
}
