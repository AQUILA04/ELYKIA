import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { DatabaseService } from '../services/database.service';

// Transaction interface might be in 'transaction.model.ts'.
// I will try to import it.
import { Transaction } from '../../models/transaction.model';

@Injectable({
    providedIn: 'root'
})
export class TransactionRepository extends BaseRepository<Transaction, string> {
    protected tableName = 'transactions';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Transaction[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const sql = `INSERT INTO transactions
               (id, clientId, referenceId, type, amount, details, date, isSync, isLocal)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        for (const transaction of entities) {
            // DatabaseService.addTransaction generates UUID if not present?
            // Actually DBService.addTransaction generates it: this.generateUuid().
            // I should probably expect ID to be present or generate it.
            // I'll use the one from entity or generate one.
            // Since I don't have access to private generateUuid, I'll assume entity has ID or I'll use a simple random string/UUID.

            const id = transaction.id || this.generateUuid();

            const params = [
                id,
                transaction.clientId ?? null,
                transaction.referenceId ?? null,
                transaction.type?.toLowerCase() ?? 'unknown',
                transaction.amount ?? 0,
                transaction.details ?? null,
                transaction.date ?? new Date().toISOString(),
                transaction.isSync ? 1 : 0,
                transaction.isLocal ? 1 : 0
            ];

            await this.databaseService['db'].run(sql, params);
        }
    }

    // ==================== SPECIFIC QUERY METHODS ====================

    /**
     * Get transactions for a specific commercial
     * @param commercialId ID of the commercial
     * @returns Array of transactions for the commercial's clients
     */
    async getByCommercialId(commercialId: string): Promise<any[]> {
        if (!this.databaseService['db']) {
            console.error('Database not initialized.');
            return [];
        }
        const sql = `
            SELECT t.* FROM transactions t
            JOIN clients c ON t.clientId = c.id
            WHERE c.commercial = ?
        `;
        const ret = await this.databaseService.query(sql, [commercialId]);
        return ret.values || [];
    }

    /**
     * Get transactions for a specific client with pagination
     */
    async findTransactionsByClientPaginated(clientId: string, offset: number, limit: number): Promise<Transaction[]> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const sql = `SELECT * FROM transactions WHERE clientId = ? ORDER BY date DESC LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [clientId, limit, offset]);
        return result.values || [];
    }
}
