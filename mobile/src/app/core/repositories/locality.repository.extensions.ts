import { Injectable } from '@angular/core';
import { LocalityRepository } from './locality.repository';
import { Locality } from '../../models/locality.model';
import { Page, RepositoryViewFilters } from './repository.interface';

export interface LocalityRepositoryFilters extends RepositoryViewFilters {
    isActive?: boolean | number;
    isLocal?: boolean;
    isSync?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class LocalityRepositoryExtensions {

    constructor(private localityRepository: LocalityRepository) { }

    /**
     * Get paginated localities
     * 
     * @param page Page number (zero-indexed)
     * @param size Number of items per page
     * @param filters Optional filters
     * @returns Page of localities
     */
    async findAllPaginated(
        page: number,
        size: number,
        filters?: LocalityRepositoryFilters
    ): Promise<Page<Locality>> {
        const offset = page * size;

        let whereConditions: string[] = [];
        const params: any[] = [];

        if (filters?.isActive !== undefined) {
            whereConditions.push('isActive = ?');
            params.push(filters.isActive ? 1 : 0);
        } else if (filters?.isSync === undefined) {
            // Default to active only if we are not syncing
            // If syncing (isSync defined), ignore isActive default
            whereConditions.push('isActive = 1');
        }

        if (filters?.searchQuery) {
            whereConditions.push('(name LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern);
        }

        if (filters?.isLocal !== undefined) {
            whereConditions.push('isLocal = ?');
            params.push(filters.isLocal ? 1 : 0);
        }

        if (filters?.isSync !== undefined) {
            whereConditions.push('isSync = ?');
            params.push(filters.isSync ? 1 : 0);
        }

        const whereClause = whereConditions.join(' AND ');

        // Count total items
        const countSql = `SELECT COUNT(*) as total FROM localities WHERE ${whereClause}`;
        const countResult = await this.localityRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Get paginated data
        const dataSql = `SELECT * FROM localities WHERE ${whereClause} ORDER BY name ASC LIMIT ${size} OFFSET ${offset}`;
        const dataResult = await this.localityRepository['getDatabaseService']().query(dataSql, params);
        const content = (dataResult.values || []) as Locality[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    /**
     * Count localities
     * 
     * @param filters Optional filters
     * @returns Total count of localities
     */
    async count(
        filters?: LocalityRepositoryFilters
    ): Promise<number> {
        const checkActive = 1;
        let whereConditions = ['isActive = ?'];
        const params: any[] = [checkActive];

        if (filters?.searchQuery) {
            whereConditions.push('(name LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern);
        }

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as total FROM localities WHERE ${whereClause}`;
        const result = await this.localityRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }
}
