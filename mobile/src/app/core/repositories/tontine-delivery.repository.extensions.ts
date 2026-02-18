/**
 * Tontine Delivery Repository Extensions
 * 
 * This file contains pagination-specific methods for the TontineDeliveryRepository.
 * All methods enforce commercial-level data isolation.
 */

import { Injectable } from '@angular/core';
import { TontineDeliveryRepository } from './tontine-delivery.repository';
import { TontineDelivery, TontineDeliveryItem } from '../../models/tontine.model';
import { Page, RepositoryViewFilters } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';

// We need an interface for TontineDeliveryView if not exported
export interface TontineDeliveryView extends TontineDelivery {
    clientName: string;
    clientQuarter?: string;
}

export interface TontineDeliveryRepositoryFilters extends RepositoryViewFilters {
    status?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TontineDeliveryRepositoryExtensions {

    constructor(private tontineDeliveryRepository: TontineDeliveryRepository) { }

    /**
     * Get paginated tontine deliveries (views) for a specific commercial
     * 
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of TontineDeliveryView
     */
    async findViewsByCommercialPaginated(
        commercialUsername: string,
        page: number,
        size: number,
        filters?: TontineDeliveryRepositoryFilters
    ): Promise<Page<TontineDeliveryView>> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot query delivery views without commercial filter');
        }

        const offset = page * size;

        // Use 'td' for delivery, 'tm' for member, 'c' for client

        let whereConditions = [`td.commercialUsername = ?`];
        const params: any[] = [commercialUsername];

        // Add optional filters
        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');

        // Count with JOIN
        const countSql = `
            SELECT COUNT(*) as total 
            FROM tontine_deliveries td 
            JOIN tontine_members tm ON td.tontineMemberId = tm.id
            JOIN clients c ON tm.clientId = c.id
            WHERE ${whereClause}
        `;
        const countResult = await this.tontineDeliveryRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Data with JOIN
        const dataSql = `
            SELECT td.*, 
                   c.fullName as clientName, 
                   c.quarter as clientQuarter
            FROM tontine_deliveries td 
            JOIN tontine_members tm ON td.tontineMemberId = tm.id
            JOIN clients c ON tm.clientId = c.id
            WHERE ${whereClause} 
            ORDER BY td.requestDate DESC 
            LIMIT ${size} OFFSET ${offset}
        `;

        const dataResult = await this.tontineDeliveryRepository['getDatabaseService']().query(dataSql, params);
        const rows = (dataResult.values || []) as TontineDeliveryView[];

        return {
            content: rows,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    private applyFilters(whereConditions: string[], params: any[], filters?: any) {
        if (filters?.status) {
            whereConditions.push('td.status = ?');
            params.push(filters.status);
        }

        if (filters?.searchQuery) {
            // Search client name
            whereConditions.push('(c.fullName LIKE ? OR c.phone LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'td.requestDate');
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
            whereConditions.push('td.isLocal = ?');
            params.push(filters.isLocal ? 1 : 0);
        }

        if (filters?.isSync !== undefined) {
            whereConditions.push('td.isSync = ?');
            params.push(filters.isSync ? 1 : 0);
        }
    }
}
