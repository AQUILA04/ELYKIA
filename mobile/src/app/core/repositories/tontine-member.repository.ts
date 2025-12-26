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
        const query = `
            SELECT tm.*, c.fullName as clientName, c.phone as clientPhone
            FROM tontine_members tm
            LEFT JOIN clients c ON tm.clientId = c.id
            WHERE tm.tontineSessionId = ? AND tm.commercialUsername = ?
        `;
        const result = await this.databaseService.query(query, [sessionId, commercialUsername]);
        return result.values || [];
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

}
