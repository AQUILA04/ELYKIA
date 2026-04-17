import { Injectable } from '@angular/core';
import { TransactionRepository } from './transaction.repository';
import { Transaction } from '../../models/transaction.model';
import { Page, RepositoryViewFilters } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';

export interface TransactionRepositoryFilters extends RepositoryViewFilters {
    clientId?: string;
    type?: string;
}

/**
 * Extended pagination methods for TransactionRepository
 */
@Injectable({
    providedIn: 'root'
})
export class TransactionRepositoryExtensions {

    constructor(private transactionRepository: TransactionRepository) { }

    /**
     * Get paginated transactions for a specific commercial
     *
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     *
     * @param commercialId ID of the commercial (REQUIRED)
     * @param page Page number (zero-indexed)
     * @param size Number of items per page
     * @param filters Optional filters
     * @returns Page of transactions
     */
    async findByCommercialPaginated(
        commercialId: string,
        page: number,
        size: number,
        filters?: TransactionRepositoryFilters
    ): Promise<Page<Transaction>> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot query transactions without commercial filter');
        }

        const offset = page * size;

        // Use 't' alias for transaction, 'c' for client
        // Transactions are linked to clients, clients are linked to commercial
        let whereConditions = [`c.commercial = ?`];
        const params: any[] = [commercialId];

        // Add optional filters
        if (filters?.clientId) {
            whereConditions.push('t.clientId = ?');
            params.push(filters.clientId);
        }

        if (filters?.type) {
            whereConditions.push('t.type = ?');
            params.push(filters.type);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 't.date');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        if (filters?.searchQuery) {
            whereConditions.push('(t.details LIKE ? OR t.referenceId LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern);
        }

        const whereClause = whereConditions.join(' AND ');

        // Count with JOIN
        const countSql = `
            SELECT COUNT(*) as total
            FROM transactions t
            JOIN clients c ON t.clientId = c.id
            WHERE ${whereClause}
        `;
        const countResult = await this.transactionRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Data with JOIN
        const dataSql = `
            SELECT t.*
            FROM transactions t
            JOIN clients c ON t.clientId = c.id
            WHERE ${whereClause}
            ORDER BY t.date DESC
            LIMIT ${size} OFFSET ${offset}
        `;

        const dataResult = await this.transactionRepository['getDatabaseService']().query(dataSql, params);
        const content = (dataResult.values || []) as Transaction[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }
}
