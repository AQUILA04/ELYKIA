import { Injectable } from '@angular/core';
import { DistributionRepository } from './distribution.repository';
import { Distribution } from '../../models/distribution.model';
import { Page, RepositoryViewFilters } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';
import { DistributionView } from '../../models/distribution-view.model';
import { Client } from '../../models/client.model';

export interface DistributionRepositoryFilters extends RepositoryViewFilters {
    status?: string;
    clientId?: string;
}

/**
 * Extended pagination methods for DistributionRepository
 */
@Injectable({
    providedIn: 'root'
})
export class DistributionRepositoryExtensions {

    constructor(private distributionRepository: DistributionRepository) { }

    /**
     * Get paginated distributions for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param page Page number (zero-indexed)
     * @param size Number of items per page
     * @param filters Optional filters (status, date filter, etc.)
     * @returns Page of distributions
     */
    async findByCommercialPaginated(
        commercialId: string,
        page: number,
        size: number,
        filters?: DistributionRepositoryFilters
    ): Promise<Page<Distribution>> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot query distributions without commercial filter');
        }

        const offset = page * size;

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('distribution');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];

        // Add optional filters
        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');

        // Count total items
        const countSql = `SELECT COUNT(*) as total FROM distributions WHERE ${whereClause}`;
        const countResult = await this.distributionRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Get paginated data
        const dataSql = `SELECT * FROM distributions WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ${size} OFFSET ${offset}`;
        const dataResult = await this.distributionRepository['getDatabaseService']().query(dataSql, params);
        const content = (dataResult.values || []) as Distribution[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    /**
     * Get paginated distribution views (with client info) for a specific commercial
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of DistributionView
     */
    async findViewsByCommercialPaginated(
        commercialId: string,
        page: number,
        size: number,
        filters?: DistributionRepositoryFilters
    ): Promise<Page<DistributionView>> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot query distribution views without commercial filter');
        }

        const offset = page * size;

        // Use 'd' alias for distributions, 'c' for clients
        // buildCommercialFilterCondition('distribution') usually returns 'commercialId = ?' (or 'commercial'?)
        // Distribution table has 'commercialId' ? No, 'commercial' usually?
        // Let's check database.service.ts or models.
        // Distribution model has 'commercial' (string).
        // Since we alias distribution as 'd', we need 'd.commercial = ?'.

        let whereConditions = [`d.commercial = ?`];
        const params: any[] = [commercialId];

        // Add optional filters
        if (filters?.status) {
            whereConditions.push('d.status = ?');
            params.push(filters.status);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'd.createdAt');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        if (filters?.clientId) {
            whereConditions.push('d.clientId = ?');
            params.push(filters.clientId);
        }

        // New Filters
        if (filters?.quarter) {
            whereConditions.push('c.quarter = ?');
            params.push(filters.quarter);
        }

        if (filters?.searchQuery) {
            // Search on distribution reference OR client name/phone
            whereConditions.push('(d.reference LIKE ? OR c.fullName LIKE ? OR c.phone LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (filters?.isLocal !== undefined) {
            whereConditions.push('d.isLocal = ?');
            params.push(filters.isLocal ? 1 : 0);
        }

        if (filters?.isSync !== undefined) {
            whereConditions.push('d.isSync = ?');
            params.push(filters.isSync ? 1 : 0);
        }

        const whereClause = whereConditions.join(' AND ');

        // Count with JOIN (because we might filter by client quarter)
        const countSql = `
            SELECT COUNT(*) as total 
            FROM distributions d 
            JOIN clients c ON d.clientId = c.id 
            WHERE ${whereClause}
        `;
        const countResult = await this.distributionRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Data with JOIN and JSON Aggregation for items
        const dataSql = `
            SELECT d.*, 
                   c.fullName as clientName, 
                   c.phone as clientPhone, 
                   c.quarter as clientQuarter,
                   c.address as clientAddress,
                   c.location as clientLocation,
                   (
                       SELECT json_group_array(
                           json_object(
                               'articleId', di.articleId,
                               'quantity', di.quantity,
                               'unitPrice', di.unitPrice,
                               'totalPrice', di.totalPrice,
                               'article', json_object(
                                   'id', a.id,
                                   'name', a.name,
                                   'commercialName', a.commercialName,
                                   'type', a.type,
                                   'photo', a.photo
                               )
                           )
                       )
                       FROM distribution_items di
                       JOIN articles a ON di.articleId = a.id
                       WHERE di.distributionId = d.id
                   ) as itemsJson
            FROM distributions d 
            JOIN clients c ON d.clientId = c.id
            WHERE ${whereClause} 
            ORDER BY d.createdAt DESC 
            LIMIT ${size} OFFSET ${offset}
        `;

        const dataResult = await this.distributionRepository['getDatabaseService']().query(dataSql, params);
        const rows = (dataResult.values || []) as any[];

        const content: DistributionView[] = rows.map(row => {
            const distribution = { ...row };

            // Construct Client object (partial) for legacy support
            const client: Client = {
                id: row.clientId,
                fullName: row.clientName,
                phone: row.clientPhone,
                quarter: row.clientQuarter,
                address: row.clientAddress,
                location: row.clientLocation
            } as any;

            // Parse items from JSON
            let items: any[] = [];
            try {
                if (row.itemsJson) {
                    items = JSON.parse(row.itemsJson);
                }
            } catch (e) {
                console.error('Error parsing itemsJson for distribution', row.id, e);
            }

            return {
                ...distribution,
                client: client,
                clientName: row.clientName,
                clientPhone: row.clientPhone,
                clientQuarter: row.clientQuarter,
                items: items
            };
        });

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    /**
     * Count distributions for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total count of distributions
     */
    async countByCommercial(
        commercialId: string,
        filters?: DistributionRepositoryFilters
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot count distributions without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('distribution');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];

        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as total FROM distributions WHERE ${whereClause}`;
        const result = await this.distributionRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Get total distribution amount for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total amount of distributions
     */
    async getTotalAmountByCommercial(
        commercialId: string,
        filters?: DistributionRepositoryFilters
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot calculate distribution amount without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('distribution');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];

        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COALESCE(SUM(totalAmount), 0) as total FROM distributions WHERE ${whereClause}`;
        const result = await this.distributionRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Count active distributions for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param dateFilter Optional date filter
     * @returns Count of active distributions
     */
    async countActiveByCommercial(
        commercialId: string,
        dateFilter?: DateFilter
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot count active distributions without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('distribution');
        let whereConditions = [commercialCondition, "status = 'ACTIVE'"];
        const params: any[] = [commercialId];

        // Add date filter using helper function
        if (dateFilter) {
            const dateFilterResult = buildDateFilterClause(dateFilter, 'createdAt');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as total FROM distributions WHERE ${whereClause}`;
        const result = await this.distributionRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Get total remaining amount for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total remaining amount
     */
    async getTotalRemainingAmountByCommercial(
        commercialId: string,
        filters?: DistributionRepositoryFilters
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot calculate remaining amount without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('distribution');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];

        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COALESCE(SUM(remainingAmount), 0) as total FROM distributions WHERE ${whereClause}`;
        const result = await this.distributionRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Get total daily payment amount (for active distributions) for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @returns Total daily payment expected
     */
    async getTotalDailyPaymentAmountByCommercial(
        commercialId: string
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot calculate daily payment amount without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('distribution');
        // Only sum for Active or InProgress distributions? Usually 'INPROGRESS' implies active billing.
        // Let's assume 'INPROGRESS' is the status for active distributions that generate daily payments.
        const whereConditions = [commercialCondition, "status = 'INPROGRESS'"];
        const params: any[] = [commercialId];

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COALESCE(SUM(dailyPayment), 0) as total FROM distributions WHERE ${whereClause}`;
        const result = await this.distributionRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Get total advances amount for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param dateFilter Optional date filter
     * @returns Total advances amount
     */
    async getTotalAdvancesByCommercial(
        commercialId: string,
        dateFilter?: DateFilter
    ): Promise<{ count: number; totalAmount: number }> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot calculate advances without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('distribution');
        let whereConditions = [commercialCondition, 'advance > 0'];
        const params: any[] = [commercialId];

        if (dateFilter) {
            const dateFilterResult = buildDateFilterClause(dateFilter, 'createdAt');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as count, COALESCE(SUM(advance), 0) as totalAmount FROM distributions WHERE ${whereClause}`;
        const result = await this.distributionRepository['getDatabaseService']().query(sql, params);

        return {
            count: result.values?.[0]?.count || 0,
            totalAmount: result.values?.[0]?.totalAmount || 0
        };
    }

    private applyFilters(whereConditions: string[], params: any[], filters?: any) {
        if (filters?.status) {
            whereConditions.push('status = ?');
            params.push(filters.status);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'createdAt');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        if (filters?.clientId) {
            whereConditions.push('clientId = ?');
            params.push(filters.clientId);
        }

        if (filters?.isLocal !== undefined) {
            whereConditions.push('isLocal = ?');
            params.push(filters.isLocal ? 1 : 0);
        }

        if (filters?.isSync !== undefined) {
            whereConditions.push('isSync = ?');
            params.push(filters.isSync ? 1 : 0);
        }
    }
}
