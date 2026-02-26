import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { DatabaseService } from '../services/database.service';
import { TontineMember } from '../../models/tontine.model';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class TontineMemberRepository extends BaseRepository<TontineMember, string> {
    protected tableName = 'tontine_members';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: TontineMember[]): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        if (!entities.length) return;

        const query = `
      INSERT OR REPLACE INTO tontine_members (
        id, tontineSessionId, clientId, commercialUsername, totalContribution, deliveryStatus, registrationDate, isLocal, isSync, syncDate, syncHash, frequency, amount, notes, updateScope
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const set: capSQLiteSet[] = entities.map(m => {
            const member = m as any;
            return {
                statement: query,
                values: [
                    member.id, member.tontineSessionId, member.clientId, member.commercialUsername, member.totalContribution, member.deliveryStatus,
                    member.registrationDate, member.isLocal ? 1 : 0, member.isSync ? 1 : 0, member.syncDate || new Date().toISOString(), member.syncHash,
                    member.frequency || null, member.amount || null, member.notes || null, member.updateScope || null
                ]
            };
        });

        await this.databaseService.executeSet(set);
    }

    override async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<TontineMember[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const sql = `SELECT * FROM tontine_members WHERE isSync = 0 AND isLocal = 1 AND commercialUsername = ? LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [commercialUsername, limit, offset]);
        return (result.values || []).map((row: any) => ({ ...row, isLocal: row.isLocal === 1, isSync: row.isSync === 1 }));
    }

    async markAsSynced(localId: string, serverId: string): Promise<void> {
        if (!this.databaseService['db'] || localId === serverId) return;
        const updateSet = [
            { statement: `UPDATE tontine_collections SET tontineMemberId = ? WHERE tontineMemberId = ?`, values: [serverId, localId] },
            { statement: `UPDATE tontine_deliveries SET tontineMemberId = ? WHERE tontineMemberId = ?`, values: [serverId, localId] },
            { statement: `UPDATE tontine_members SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`, values: [serverId, localId] }
        ];
        await this.databaseService.executeSet(updateSet);
    }

    async findModified(commercialUsername: string, limit: number, offset: number): Promise<TontineMember[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const sql = `SELECT * FROM tontine_members WHERE isSync = 0 AND isLocal = 0 AND commercialUsername = ? LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [commercialUsername, limit, offset]);
        return (result.values || []).map((row: any) => ({ ...row, isLocal: row.isLocal === 1, isSync: row.isSync === 1 }));
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get tontine members for a specific session and commercial
     * @param sessionId ID of the tontine session
     * @param commercialUsername Username of the commercial
     * @returns Array of tontine members with client details
     */
    async getBySessionAndCommercial(sessionId: string, commercialUsername: string): Promise<any[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        // Get today's date in YYYY-MM-DD format for comparison
        const today = new Date().toISOString().split('T')[0];

        const query = `
            SELECT
                tm.*,
                c.fullName as clientName,
                c.phone as clientPhone,
                c.quarter as clientQuarter,
                CASE
                    WHEN EXISTS (
                        SELECT 1 FROM tontine_collections tc
                        WHERE tc.tontineMemberId = tm.id
                        AND substr(tc.collectionDate, 1, 10) = ?
                    ) THEN 1
                    ELSE 0
                END as isPaidToday
            FROM tontine_members tm
            LEFT JOIN clients c ON tm.clientId = c.id
            WHERE tm.tontineSessionId = ? AND tm.commercialUsername = ?
        `;

        const result = await this.databaseService.query(query, [today, sessionId, commercialUsername]);

        if (result.values && result.values.length > 0) {
            console.log('TontineMemberRepo: Sample Row:', JSON.stringify(result.values[0]));
        } else {
            console.log('TontineMemberRepo: No results found');
        }

        return (result.values || []).map((row: any) => ({
            ...row,
            hasPaidToday: !!row.isPaidToday,
            clientQuarter: row.clientQuarter || row.quarter || 'Non défini'
        }));
    }

    /**
     * Check if a client is already registered in a tontine session
     * @param sessionId ID of the tontine session
     * @param clientId ID of the client
     * @returns True if client exists, false otherwise
     */
    async checkClientExists(sessionId: string, clientId: string): Promise<boolean> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const query = `
            SELECT COUNT(*) as count FROM tontine_members
            WHERE tontineSessionId = ? AND clientId = ?
        `;
        const result = await this.databaseService.query(query, [sessionId, clientId]);
        return result.values && result.values[0] && result.values[0].count > 0;
    }

    /**
     * Update a tontine member
     * @param member The member to update
     */
    async updateMember(member: TontineMember): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');

        const query = `
            UPDATE tontine_members
            SET frequency = ?, amount = ?, notes = ?, updateScope = ?, isSync = 0, syncDate = NULL
            WHERE id = ?
        `;

        await this.databaseService.execute(query, [
            member.frequency,
            member.amount,
            member.notes,
            member.updateScope || null,
            member.id
        ]);
    }

    override async countUnsynced(): Promise<number> {
        // This method should ideally filter by commercialUsername, but BaseRepository signature doesn't allow arguments.
        // However, since we are in a specific repository, we might want to rely on the service layer to call a specific count method
        // or just return the total unsynced count for now as per BaseRepository contract.
        // But to fix Bug #4, we should try to filter if possible or rely on service.
        // Since we can't easily inject AuthService here without circular deps or architectural changes,
        // we will leave this as is and rely on the service layer using `getUnsyncedCount` which we will override in the service.
        return super.countUnsynced();
    }

    /**
     * Get tontine members registered on a specific date for a commercial
     * @param commercialUsername Commercial username
     * @param date Date string (YYYY-MM-DD)
     * @returns Array of tontine members with client names
     */
    async findByCommercialAndDate(commercialUsername: string, date: string): Promise<any[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const sql = `
            SELECT tm.*, c.fullName as clientName
            FROM tontine_members tm
            LEFT JOIN clients c ON tm.clientId = c.id
            WHERE tm.commercialUsername = ? AND tm.registrationDate LIKE ?
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
