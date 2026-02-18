/**
 * Tontine Collection Repository Extensions
 * 
 * This file contains pagination-specific methods for the TontineCollectionRepository.
 * All methods enforce commercial-level data isolation.
 */

import { Injectable } from '@angular/core';
import { TontineCollectionRepository } from './tontine-collection.repository';
import { TontineCollection, TontineCollectionView } from '../../models/tontine.model';
import { Page, RepositoryViewFilters } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';

export interface TontineCollectionRepositoryFilters extends RepositoryViewFilters {
    // defined in base + extras if needed
}

@Injectable({
    providedIn: 'root'
})
export class TontineCollectionRepositoryExtensions {

    constructor(private tontineCollectionRepository: TontineCollectionRepository) { }

    /**
     * Get paginated tontine collections (views) for a specific commercial
     * 
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of TontineCollectionView
     */
    async findViewsByCommercialPaginated(
        commercialUsername: string,
        page: number,
        size: number,
        filters?: TontineCollectionRepositoryFilters
    ): Promise<Page<TontineCollectionView>> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot query collection views without commercial filter');
        }

        const offset = page * size;

        // Use 'tc' for collection, 'tm' for member, 'c' for client
        // Commercial check usually on tontine_collections (commercialUsername column) OR member?
        // TontineCollection entity has `commercialUsername`.
        // So `tc.commercialUsername = ?`.

        let whereConditions = [`tc.commercialUsername = ?`];
        const params: any[] = [commercialUsername];

        // Add optional filters
        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');

        // Count with JOIN
        // Note: join might be needed if filtering by client quarter
        const countSql = `
            SELECT COUNT(*) as total 
            FROM tontine_collections tc 
            JOIN tontine_members tm ON tc.tontineMemberId = tm.id
            JOIN clients c ON tm.clientId = c.id
            WHERE ${whereClause}
        `;
        const countResult = await this.tontineCollectionRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Data with JOIN
        const dataSql = `
            SELECT tc.*, 
                   c.fullName as clientName, 
                   c.quarter as clientQuarter
            FROM tontine_collections tc 
            JOIN tontine_members tm ON tc.tontineMemberId = tm.id
            JOIN clients c ON tm.clientId = c.id
            WHERE ${whereClause} 
            ORDER BY tc.collectionDate DESC 
            LIMIT ${size} OFFSET ${offset}
        `;

        const dataResult = await this.tontineCollectionRepository['getDatabaseService']().query(dataSql, params);
        const rows = (dataResult.values || []) as TontineCollectionView[];

        return {
            content: rows,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    /**
     * Get total collection amount for a specific commercial
     * 
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total collection amount
     */
    async getTotalCollectionAmountByCommercial(
        commercialUsername: string,
        filters?: TontineCollectionRepositoryFilters
    ): Promise<number> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot calculate collection amount without filter');
        }

        let whereConditions = [`tc.commercialUsername = ?`];
        const params: any[] = [commercialUsername];

        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');

        // Need JOIN if filtering by client attributes (which applyFilters might do)
        // applyFilters uses 'c.quarter' so we need to join clients
        const sql = `
            SELECT COALESCE(SUM(tc.amount), 0) as total 
            FROM tontine_collections tc 
            JOIN tontine_members tm ON tc.tontineMemberId = tm.id
            JOIN clients c ON tm.clientId = c.id
            WHERE ${whereClause}
        `;
        const result = await this.tontineCollectionRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    private applyFilters(whereConditions: string[], params: any[], filters?: any) {
        if (filters?.searchQuery) {
            // Search client name
            whereConditions.push('(c.fullName LIKE ? OR c.phone LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'tc.collectionDate');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        if (filters?.quarter) {
            whereConditions.push('c.quarter = ?');
            params.push(filters.quarter);
        }

        if (filters?.isLocal !== undefined) {
            whereConditions.push('tc.isLocal = ?');
            params.push(filters.isLocal ? 1 : 0);
        }

        if (filters?.isSync !== undefined) {
            whereConditions.push('tc.isSync = ?');
            params.push(filters.isSync ? 1 : 0);
        }
    }
}
