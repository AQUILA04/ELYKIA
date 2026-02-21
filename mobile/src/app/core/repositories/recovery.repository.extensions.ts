import { Injectable } from '@angular/core';
import { RecoveryRepository } from './recovery.repository';
import { Recovery } from '../../models/recovery.model';
import { Page, RepositoryViewFilters } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';
import { RecoveryView } from '../../models/recovery-view.model';
import { Client } from '../../models/client.model';
import { Distribution } from '../../models/distribution.model';

export interface RecoveryRepositoryFilters extends RepositoryViewFilters {
    paymentMethod?: string;
    clientId?: string;
}

/**
 * Extended pagination methods for RecoveryRepository
 */
@Injectable({
    providedIn: 'root'
})
export class RecoveryRepositoryExtensions {

    constructor(private recoveryRepository: RecoveryRepository) { }

    /**
     * Get paginated recoveries for a specific commercial
     *
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     *
     * @param commercialId ID of the commercial (REQUIRED)
     * @param page Page number (zero-indexed)
     * @param size Number of items per page
     * @param filters Optional filters (date filter, payment method, etc.)
     * @returns Page of recoveries
     */
    async findByCommercialPaginated(
        commercialId: string,
        page: number,
        size: number,
        filters?: RecoveryRepositoryFilters
    ): Promise<Page<Recovery>> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot query recoveries without commercial filter');
        }

        const offset = page * size;

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('recovery');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];

        // Add optional filters
        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');

        // Count total items
        const countSql = `SELECT COUNT(*) as total FROM recoveries WHERE ${whereClause}`;
        const countResult = await this.recoveryRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Get paginated data
        const dataSql = `SELECT * FROM recoveries WHERE ${whereClause} ORDER BY paymentDate DESC LIMIT ${size} OFFSET ${offset}`;
        const dataResult = await this.recoveryRepository['getDatabaseService']().query(dataSql, params);
        const content = (dataResult.values || []) as Recovery[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    /**
     * Get paginated recovery views (with client and distribution info) for a specific commercial
     *
     * @param commercialId ID of the commercial (REQUIRED)
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of RecoveryView
     */
    async findViewsByCommercialPaginated(
        commercialId: string,
        page: number,
        size: number,
        filters?: RecoveryRepositoryFilters
    ): Promise<Page<RecoveryView>> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot query recovery views without commercial filter');
        }

        const offset = page * size;

        // Use 'r' alias for recovery, 'c' for client, 'd' for distribution
        // commercial condition on recovery table
        // FIX: Use 'commercialId' column as per database schema, not 'commercial'
        let whereConditions = [`r.commercialId = ?`];
        const params: any[] = [commercialId];

        // Add optional filters
        if (filters?.paymentMethod) {
            whereConditions.push('r.paymentMethod = ?');
            params.push(filters.paymentMethod);
        }

        if (filters?.clientId) {
            whereConditions.push('r.clientId = ?');
            params.push(filters.clientId);
        }

        // Date filter on paymentDate
        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'r.paymentDate');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        // New Filters
        if (filters?.quarter) {
            whereConditions.push('c.quarter = ?');
            params.push(filters.quarter);
        }

        if (filters?.searchQuery) {
            // Search on client name/phone or distribution reference?
            // recoveries don't have many searchable text fields except maybe 'amount' or linked data.
            whereConditions.push('(c.fullName LIKE ? OR c.phone LIKE ? OR d.reference LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (filters?.isLocal !== undefined) {
            whereConditions.push('r.isLocal = ?');
            params.push(filters.isLocal ? 1 : 0);
        }

        if (filters?.isSync !== undefined) {
            whereConditions.push('r.isSync = ?');
            params.push(filters.isSync ? 1 : 0);
        }

        const whereClause = whereConditions.join(' AND ');

        // Count with JOIN
        // Changed JOIN to LEFT JOIN to include recoveries even if client is missing (orphaned)
        const countSql = `
            SELECT COUNT(*) as total
            FROM recoveries r
            LEFT JOIN clients c ON r.clientId = c.id
            LEFT JOIN distributions d ON r.distributionId = d.id
            WHERE ${whereClause}
        `;
        const countResult = await this.recoveryRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Data with JOIN
        // Changed JOIN to LEFT JOIN to include recoveries even if client is missing (orphaned)
        const dataSql = `
            SELECT r.*,
                   c.fullName as clientName,
                   c.quarter as clientQuarter,
                   d.reference as distributionReference
            FROM recoveries r
            LEFT JOIN clients c ON r.clientId = c.id
            LEFT JOIN distributions d ON r.distributionId = d.id
            WHERE ${whereClause}
            ORDER BY r.paymentDate DESC
            LIMIT ${size} OFFSET ${offset}
        `;

        const dataResult = await this.recoveryRepository['getDatabaseService']().query(dataSql, params);
        const rows = (dataResult.values || []) as any[];

        const content: RecoveryView[] = rows.map(row => {
            const recovery = { ...row };

            // Construct Client/Distribution objects if needed for nested property, or rely on flat fields?
            // RecoveryView has client: Client | undefined;
            // We have partial client data (only name and quarter).
            // To be safe, we can populate what we have or fetch?
            // Fetching is N+1. avoid.
            // Populate partial or set to undefined?
            // RecoveryView definition: client: Client | undefined.
            // If we have id and name, we can make a partial object.

            const client: Client | undefined = row.clientId ? {
                id: row.clientId,
                fullName: row.clientName || 'Client Inconnu', // Fallback name
                quarter: row.clientQuarter
                // other mandatory fields missing
            } as any : undefined;

            const distribution: Distribution | undefined = row.distributionId ? {
                id: row.distributionId,
                reference: row.distributionReference
            } as any : undefined;

            return {
                ...recovery,
                client,
                distribution,
                clientName: row.clientName || 'Client Inconnu', // Fallback name
                clientQuarter: row.clientQuarter,
                distributionReference: row.distributionReference
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
     * Count recoveries for a specific commercial
     *
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     *
     * @param commercialId ID of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total count of recoveries
     */
    async countByCommercial(
        commercialId: string,
        filters?: {
            dateFilter?: DateFilter;
            paymentMethod?: string;
        }
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot count recoveries without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('recovery');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];

        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as total FROM recoveries WHERE ${whereClause}`;
        const result = await this.recoveryRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Get total recovery amount for a specific commercial
     *
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     *
     * @param commercialId ID of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total amount of recoveries
     */
    async getTotalAmountByCommercial(
        commercialId: string,
        filters?: {
            dateFilter?: DateFilter;
            paymentMethod?: string;
        }
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot calculate recovery amount without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('recovery');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];

        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COALESCE(SUM(amount), 0) as total FROM recoveries WHERE ${whereClause}`;

        const result = await this.recoveryRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Get average recovery amount for a specific commercial
     *
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     *
     * @param commercialId ID of the commercial (REQUIRED)
     * @param dateFilter Optional date filter
     * @returns Average recovery amount
     */
    async getAverageAmountByCommercial(
        commercialId: string,
        dateFilter?: DateFilter
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot calculate average recovery amount without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('recovery');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];

        if (dateFilter) {
            const dateFilterResult = buildDateFilterClause(dateFilter, 'paymentDate');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COALESCE(AVG(amount), 0) as average FROM recoveries WHERE ${whereClause}`;
        const result = await this.recoveryRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.average || 0;
    }

    private applyFilters(whereConditions: string[], params: any[], filters?: any) {
        // Add date filter using helper function (paymentDate is the default for recoveries)
        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'paymentDate');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        // Add optional filters
        if (filters?.paymentMethod) {
            whereConditions.push('paymentMethod = ?');
            params.push(filters.paymentMethod);
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
