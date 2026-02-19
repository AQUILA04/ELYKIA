import { Injectable } from '@angular/core';
import { TontineStockRepository } from './tontine-stock.repository';
import { Page, RepositoryViewFilters } from './repository.interface';
import { TontineStock } from '../../models/tontine.model';

export interface TontineStockRepositoryFilters extends RepositoryViewFilters {
    searchQuery?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TontineStockRepositoryExtensions {

    constructor(private tontineStockRepository: TontineStockRepository) { }

    /**
     * Get paginated available stocks for a specific commercial and session
     * 
     * @param commercialId ID of the commercial
     * @param sessionId ID of the session
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of TontineStock
     */
    async findAvailableStocksByCommercialPaginated(
        commercialId: string,
        sessionId: string,
        page: number,
        size: number,
        filters?: TontineStockRepositoryFilters
    ): Promise<Page<TontineStock>> {
        if (!commercialId || !sessionId) {
            throw new Error('commercialId and sessionId are required');
        }

        const offset = page * size;

        let whereConditions = ['commercial = ?', 'tontineSessionId = ?', 'availableQuantity > 0'];
        const params: any[] = [commercialId, sessionId];

        if (filters?.searchQuery) {
            whereConditions.push('articleName LIKE ?');
            params.push(`%${filters.searchQuery}%`);
        }

        const whereClause = whereConditions.join(' AND ');

        // Count total items
        const countSql = `SELECT COUNT(*) as total FROM tontine_stocks WHERE ${whereClause}`;
        const countResult = await this.tontineStockRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Get paginated data
        const dataSql = `SELECT * FROM tontine_stocks WHERE ${whereClause} ORDER BY articleName LIMIT ${size} OFFSET ${offset}`;
        const dataResult = await this.tontineStockRepository['getDatabaseService']().query(dataSql, params);
        const content = (dataResult.values || []) as TontineStock[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }
}
