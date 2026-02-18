import { Injectable } from '@angular/core';
import { TontineMemberRepository } from './tontine-member.repository';
import { TontineMember, TontineMemberView } from '../../models/tontine.model';
import { Page, RepositoryViewFilters } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';

export interface TontineMemberRepositoryFilters extends RepositoryViewFilters {
    deliveryStatus?: string;
    status?: string;
}

/**
 * Extended pagination methods for TontineMemberRepository
 */
@Injectable({
    providedIn: 'root'
})
export class TontineMemberRepositoryExtensions {

    constructor(private tontineMemberRepository: TontineMemberRepository) { }

    /**
     * Get paginated tontine members for a specific session and commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param sessionId ID of the tontine session
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param page Page number (zero-indexed)
     * @param size Number of items per page
     * @param filters Optional filters (delivery status, etc.)
     * @returns Page of tontine members with client details
     */
    async findBySessionAndCommercialPaginated(
        sessionId: string,
        commercialUsername: string,
        page: number,
        size: number,
        filters?: TontineMemberRepositoryFilters
    ): Promise<Page<TontineMemberView>> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot query tontine members without commercial filter');
        }

        const offset = page * size;
        const today = new Date().toISOString().split('T')[0];

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('tontineMember', 'tm');
        let whereConditions = ['tm.tontineSessionId = ?', commercialCondition];
        const params: any[] = [sessionId, commercialUsername];

        // Add optional filters
        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');

        // Count total items with JOIN (needed for quarter filter)
        const countSql = `
            SELECT COUNT(*) as total 
            FROM tontine_members tm 
            JOIN clients c ON tm.clientId = c.id
            WHERE ${whereClause}
        `;
        const countResult = await this.tontineMemberRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Get paginated data with client details
        const dataSql = `
            SELECT 
                tm.*, 
                c.fullName as clientName, 
                c.phone as clientPhone,
                c.quarter as clientQuarter,
                CASE 
                    WHEN tc.id IS NOT NULL THEN 1 
                    ELSE 0 
                END as hasPaidToday
            FROM tontine_members tm
            LEFT JOIN clients c ON tm.clientId = c.id
            LEFT JOIN tontine_collections tc ON tm.id = tc.tontineMemberId AND substr(tc.collectionDate, 1, 10) = ?
            WHERE ${whereClause}
            ORDER BY c.fullName ASC
            LIMIT ${size} OFFSET ${offset}
        `;

        const dataParams = [...params, today];
        // WAIT. params are for WHERE clause.
        // dataSql has `?` in LEFT JOIN ON clause for `tc.collectionDate`.
        // The order of params must match the `?` appearances.
        // `tc` join is BEFORE `WHERE`.
        // So `today` should come BEFORE `params`?
        // NO. `whereClause` is used in `WHERE`. 
        // `WHERE` is AFTER `LEFT JOIN`.
        // So parameters for JOIN conditions come BEFORE parameters for WHERE conditions.
        // In my SQL string:
        // `... LEFT JOIN ... = ? WHERE ...`
        // So order is [today, ...params].
        // Verification:
        // params contains [sessionId, commercialUsername, ...filters].
        // SQL:
        // SELECT ... 
        // FROM ...
        // LEFT JOIN ... = ? (today)
        // WHERE ... ? (sessionId) AND ? (commercial) AND ...
        // So yes, [today, ...params] is correct.

        const dataResult = await this.tontineMemberRepository['getDatabaseService']().query(dataSql, [today, ...params]);
        const rows = (dataResult.values || []) as any[];

        // Map rows to TontineMemberView
        const content: TontineMemberView[] = rows.map((row: any) => {
            // TontineMemberView extends TontineMember
            // row has flat properties and tm.* properties.
            // We need to map boolean fields if they come as 0/1 from SQLite?
            // SQLite returns 0/1 for booleans.
            // Models likely expect boolean.
            // TontineMember has `isLocal`, `isSync`, `locked`.
            // We might need to cast/convert.
            // `row` has `hasPaidToday` as 0/1.
            return {
                ...row,
                hasPaidToday: !!row.hasPaidToday,
                isLocal: !!row.isLocal,
                isSync: !!row.isSync,
                locked: !!row.locked,
                // Ensure other fields are correct type if needed
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
     * Count tontine members for a specific session and commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param sessionId ID of the tontine session
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total count of tontine members
     */
    async countBySessionAndCommercial(
        sessionId: string,
        commercialUsername: string,
        filters?: TontineMemberRepositoryFilters
    ): Promise<number> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot count tontine members without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('tontineMember', 'tm');
        let whereConditions = ['tm.tontineSessionId = ?', commercialCondition];
        const params: any[] = [sessionId, commercialUsername];

        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');

        // Use JOIN if filtering by client fields (search/quarter)
        let sql = '';
        if (filters?.searchQuery || filters?.quarter) {
            sql = `
                SELECT COUNT(*) as total 
                FROM tontine_members tm 
                JOIN clients c ON tm.clientId = c.id
                WHERE ${whereClause}
            `;
        } else {
            // Optimization: if no client filters, we don't need to join, 
            // BUT `applyFilters` adds `tm.` prefix to commercial condition.
            // If we don't join, we must ensure table alias is valid or unused if we remove alias.
            // But existing code uses `tm.` prefix.
            // `SELECT COUNT(*) FROM tontine_members tm WHERE ...` is valid.
            sql = `SELECT COUNT(*) as total FROM tontine_members tm WHERE ${whereClause}`;
        }

        const result = await this.tontineMemberRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Count tontine members for a specific commercial (across all sessions)
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total count of tontine members
     */
    async countByCommercial(
        commercialUsername: string,
        filters?: {
            dateFilter?: DateFilter;
            searchQuery?: string;
        }
    ): Promise<number> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot count tontine members without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('tontineMember', 'tm');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialUsername];

        // Apply filters directly since applyFilters expects specific filters interface
        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'tm.registrationDate');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        if (filters?.searchQuery) {
            // Requires join with clients
            whereConditions.push('(c.fullName LIKE ? OR c.phone LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern);
        }

        const whereClause = whereConditions.join(' AND ');

        let sql = '';
        if (filters?.searchQuery) {
            sql = `
                SELECT COUNT(*) as total 
                FROM tontine_members tm 
                JOIN clients c ON tm.clientId = c.id
                WHERE ${whereClause}
            `;
        } else {
            sql = `SELECT COUNT(*) as total FROM tontine_members tm WHERE ${whereClause}`;
        }

        const result = await this.tontineMemberRepository['getDatabaseService']().query(sql, params);
        return result.values?.[0]?.total || 0;
    }

    /**
     * Get total collected amount for a tontine session (filtered by commercial)
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param sessionId ID of the tontine session
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @returns Total collected amount
     */
    async getTotalCollectedBySessionAndCommercial(
        sessionId: string,
        commercialUsername: string
    ): Promise<number> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot calculate tontine total without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('tontineMember', 'tm');
        const sql = `
            SELECT COALESCE(SUM(tc.amount), 0) as total
            FROM tontine_collections tc
            INNER JOIN tontine_members tm ON tc.tontineMemberId = tm.id
            WHERE tm.tontineSessionId = ? AND ${commercialCondition}
        `;
        const result = await this.tontineMemberRepository['getDatabaseService']().query(sql, [sessionId, commercialUsername]);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Count pending deliveries for a tontine session (filtered by commercial)
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param sessionId ID of the tontine session
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @returns Count of pending deliveries
     */
    async countPendingDeliveriesBySessionAndCommercial(
        sessionId: string,
        commercialUsername: string
    ): Promise<number> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot count pending deliveries without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('tontineMember', 'tm');
        const sql = `
            SELECT COUNT(*) as total 
            FROM tontine_members tm
            WHERE tm.tontineSessionId = ? AND ${commercialCondition} AND tm.deliveryStatus = 'PENDING'
        `;
        const result = await this.tontineMemberRepository['getDatabaseService']().query(sql, [sessionId, commercialUsername]);

        return result.values?.[0]?.total || 0;
    }

    private applyFilters(whereConditions: string[], params: any[], filters?: any) {
        if (filters?.deliveryStatus) {
            whereConditions.push('tm.deliveryStatus = ?');
            params.push(filters.deliveryStatus);
        }

        // Status Filter Logic
        if (filters?.status) {
            if (filters.status === 'todo') {
                // Filter members who have NOT collected today
                // We use the same 'today' date as in the main query
                const today = new Date().toISOString().split('T')[0];
                whereConditions.push(`NOT EXISTS (
                    SELECT 1 FROM tontine_collections tc 
                    WHERE tc.tontineMemberId = tm.id 
                    AND substr(tc.collectionDate, 1, 10) = ?
                )`);
                params.push(today);
            } else if (filters.status === 'ACTIVE') {
                // Active usually implies they are in the session (which is already filtered) 
                // and maybe not delivered? Or just all active members.
                // For now, if 'ACTIVE' is passed, we might filter by specific status if needed.
                // If TontineMember had a status column: whereConditions.push('tm.status = ?'); params.push('ACTIVE');
                // Since it relies on deliveryStatus for lifecycle:
                // whereConditions.push('tm.deliveryStatus != ?'); params.push('DELIVERED'); // Example
            }
        }

        if (filters?.searchQuery) {
            whereConditions.push('(c.fullName LIKE ? OR c.phone LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern);
        }

        if (filters?.quarter) {
            whereConditions.push('c.quarter = ?');
            params.push(filters.quarter);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'tm.registrationDate');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        if (filters?.isLocal !== undefined) {
            whereConditions.push('tm.isLocal = ?');
            params.push(filters.isLocal ? 1 : 0);
        }

        if (filters?.isSync !== undefined) {
            whereConditions.push('tm.isSync = ?');
            params.push(filters.isSync ? 1 : 0);
        }
    }
}
