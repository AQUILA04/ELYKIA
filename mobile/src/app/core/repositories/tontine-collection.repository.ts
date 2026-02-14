import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { DatabaseService } from '../services/database.service';
import { TontineCollection } from '../../models/tontine.model';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class TontineCollectionRepository extends BaseRepository<TontineCollection, string> {
    protected tableName = 'tontine_collections';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    /**
     * Override save to update member total contribution for manual collection recording
     */
    override async save(entity: TontineCollection): Promise<void> {
        return this.saveAll([entity], true);
    }

    async saveAll(entities: TontineCollection[], updateMemberTotal: boolean = false): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        if (!entities.length) return;

        const query = `
      INSERT OR REPLACE INTO tontine_collections(
        id, tontineMemberId, amount, collectionDate, commercialUsername, isLocal, isSync, syncDate, syncHash, isDeliveryCollection
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const set: capSQLiteSet[] = entities.map(c => {
            const col = c as any;
            return {
                statement: query,
                values: [
                    col.id, col.tontineMemberId, col.amount, col.collectionDate, col.commercialUsername,
                    col.isLocal ? 1 : 0, col.isSync ? 1 : 0, col.syncDate || new Date().toISOString(), col.syncHash,
                    col.isDeliveryCollection ? 1 : 0
                ]
            };
        });

        await this.databaseService.executeSet(set);

        // Update totalContribution only if explicitly requested (for manual collection recording)
        if (updateMemberTotal) {
            // Group amounts by memberId to handle multiple collections for the same member in one batch
            const memberAmounts = new Map<string, number>();

            entities.forEach(c => {
                const current = memberAmounts.get(c.tontineMemberId) || 0;
                memberAmounts.set(c.tontineMemberId, current + (c.amount || 0));
            });

            for (const [memberId, amountToAdd] of memberAmounts.entries()) {
                await this.incrementMemberTotalContribution(memberId, amountToAdd);
            }
        }
    }

    /**
     * Increment the totalContribution for a member.
     * Safer than recalculating from scratch if local history is incomplete.
     * @param memberId ID of the tontine member
     * @param amount Amount to add
     */
    async incrementMemberTotalContribution(memberId: string, amount: number): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');

        const updateQuery = `
            UPDATE tontine_members
            SET totalContribution = COALESCE(totalContribution, 0) + ?
            WHERE id = ?
        `;

        await this.databaseService.execute(updateQuery, [amount, memberId]);
    }

    /**
     * Update the totalContribution for a member by summing all their collections
     * @deprecated Use incrementMemberTotalContribution instead to avoid issues with partial local history
     * @param memberId ID of the tontine member
     */
    async updateMemberTotalContribution(memberId: string): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');

        const updateQuery = `
            UPDATE tontine_members
            SET totalContribution = (
                SELECT COALESCE(SUM(amount), 0)
                FROM tontine_collections
                WHERE tontineMemberId = ?
            )
            WHERE id = ?
        `;

        await this.databaseService.execute(updateQuery, [memberId, memberId]);
    }

    /**
     * Update the totalContribution for ALL members by summing their collections.
     * Useful after bulk sync operations to ensure consistency.
     */
    async updateAllMembersTotalContribution(): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');

        const updateQuery = `
            UPDATE tontine_members
            SET totalContribution = (
                SELECT COALESCE(SUM(amount), 0)
                FROM tontine_collections
                WHERE tontine_collections.tontineMemberId = tontine_members.id
            )
        `;

        await this.databaseService.execute(updateQuery);
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get collections for a specific tontine member
     * @param memberId ID of the tontine member
     * @returns Array of collections for the member
     */
    async getByMemberId(memberId: string): Promise<TontineCollection[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const result = await this.databaseService.query('SELECT * FROM tontine_collections WHERE tontineMemberId = ?', [memberId]);
        return result.values || [];
    }

    /**
     * Get collections for a specific commercial
     * @param commercialUsername Username of the commercial
     * @returns Array of collections for the commercial or their members
     */
    async getByCommercial(commercialUsername: string): Promise<TontineCollection[]> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');

        // Utilise JOIN pour supporter les données existantes (sans commercialUsername) et nouvelles
        const query = `
          SELECT tc.*
          FROM tontine_collections tc
          INNER JOIN tontine_members tm ON tc.tontineMemberId = tm.id
          WHERE tm.commercialUsername = ? OR tc.commercialUsername = ?
        `;

        const result = await this.databaseService.query(query, [commercialUsername, commercialUsername]);
        return result.values || [];
    }
}
