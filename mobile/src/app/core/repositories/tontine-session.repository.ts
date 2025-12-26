import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { DatabaseService } from '../services/database.service';

// Assuming TontineSession model exists or using any for now as in DatabaseService it uses 'any' in signature but likely has a model.
// I'll use 'any' for TontineSession as I didn't see a specific model import in the initial file view, but I saw tontine.model.ts in the list.
// Let's check tontine.model.ts content if needed, but 'any' is safe for now to match DatabaseService signature.
// Actually, I should try to import the model if possible.
// list_dir showed tontine.model.ts.
// I'll import it.

import { TontineSession } from '../../models/tontine.model';

@Injectable({
    providedIn: 'root'
})
export class TontineSessionRepository extends BaseRepository<TontineSession, string> {
    protected tableName = 'tontine_sessions';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: TontineSession[]): Promise<void> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');

        const query = `
      INSERT OR REPLACE INTO tontine_sessions (
        id, year, startDate, endDate, status, memberCount, totalCollected, isSync, syncDate, syncHash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        for (const session of entities) {
            // DatabaseService uses 'any' for session, so I cast to any to access properties if interface doesn't match exactly or for safety.
            const s = session as any;
            const syncHash = s.syncHash || this.generateHash(s, ['id', 'status', 'totalCollected', 'startDate', 'endDate']);

            await this.databaseService['db'].run(query, [
                s.id, s.year, s.startDate, s.endDate, s.status,
                s.memberCount, s.totalCollected, 1, new Date().toISOString(), syncHash
            ]);
        }
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get the latest tontine session
     * @returns The most recent tontine session or null
     */
    async getLatestSession(): Promise<TontineSession | null> {
        if (!this.databaseService['db']) throw new Error('Database not initialized.');
        const result = await this.databaseService.query('SELECT * FROM tontine_sessions ORDER BY year DESC, id DESC LIMIT 1');
        return result.values?.[0] || null;
    }

}
