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
        id, tontineSessionId, clientId, commercialUsername, totalContribution, deliveryStatus, registrationDate, isLocal, isSync, syncDate, syncHash, frequency, amount, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const set: capSQLiteSet[] = entities.map(m => {
            const member = m as any;
            return {
                statement: query,
                values: [
                    member.id, member.tontineSessionId, member.clientId, member.commercialUsername, member.totalContribution, member.deliveryStatus,
                    member.registrationDate, member.isLocal ? 1 : 0, member.isSync ? 1 : 0, member.syncDate || new Date().toISOString(), member.syncHash,
                    member.frequency || null, member.amount || null, member.notes || null
                ]
            };
        });

        await this.databaseService.executeSet(set);
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
            SET frequency = ?, amount = ?, notes = ?, isSync = 0, syncDate = NULL
            WHERE id = ?
        `;

        await this.databaseService.execute(query, [
            member.frequency,
            member.amount,
            member.notes,
            member.id
        ]);
    }

}
