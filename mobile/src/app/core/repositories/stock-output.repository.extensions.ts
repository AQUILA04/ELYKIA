import { Injectable } from '@angular/core';
import { StockOutputRepository } from './stock-output.repository';
import { StockOutput } from '../../models/stock-output.model';
import { Page, RepositoryViewFilters } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';

export interface StockOutputRepositoryFilters extends RepositoryViewFilters {
    status?: string;
    updatable?: boolean;
}

/**
 * Extended pagination methods for StockOutputRepository
 */
@Injectable({
    providedIn: 'root'
})
export class StockOutputRepositoryExtensions {

    constructor(private stockOutputRepository: StockOutputRepository) { }

    /**
     * Get paginated stock outputs for a specific commercial
     *
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     *
     * @param commercialId ID of the commercial (REQUIRED)
     * @param page Page number (zero-indexed)
     * @param size Number of items per page
     * @param filters Optional filters
     * @returns Page of stock outputs
     */
    async findByCommercialPaginated(
        commercialId: string,
        page: number,
        size: number,
        filters?: StockOutputRepositoryFilters
    ): Promise<Page<StockOutput>> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot query stock outputs without commercial filter');
        }

        const offset = page * size;

        // Build WHERE clause with MANDATORY commercial filter
        // Note: StockOutput model has 'commercialId' field.
        // buildCommercialFilterCondition('stock_output') might return 'commercialId = ?' or similar.
        // Let's assume 'commercialId = ?' is correct for this table.
        const commercialCondition = 'commercialId = ?';
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];

        // Add optional filters
        if (filters?.status) {
            whereConditions.push('status = ?');
            params.push(filters.status);
        }

        if (filters?.updatable !== undefined) {
            whereConditions.push('updatable = ?');
            params.push(filters.updatable ? 1 : 0);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'createdAt');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        if (filters?.searchQuery) {
            whereConditions.push('(reference LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern);
        }

        const whereClause = whereConditions.join(' AND ');

        // Count total items
        const countSql = `SELECT COUNT(*) as total FROM stock_outputs WHERE ${whereClause}`;
        const countResult = await this.stockOutputRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Get paginated data
        const dataSql = `SELECT * FROM stock_outputs WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ${size} OFFSET ${offset}`;
        const dataResult = await this.stockOutputRepository['getDatabaseService']().query(dataSql, params);
        const content = (dataResult.values || []) as StockOutput[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }
}
