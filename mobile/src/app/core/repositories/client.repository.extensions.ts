/**
 * Client Repository Extensions
 * 
 * This file contains pagination-specific methods for the ClientRepository.
 * All methods enforce commercial-level data isolation.
 */

import { Injectable } from '@angular/core';
import { ClientRepository } from './client.repository';
import { Client } from '../../models/client.model';
import { Page } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';
import { ClientView } from '../../models/client-view.model';
import { Account } from '../../models/account.model';
import { RepositoryViewFilters } from './repository.interface';

export interface ClientRepositoryFilters extends RepositoryViewFilters {
    clientType?: string;
}

/**
 * Extended pagination methods for ClientRepository
 */
@Injectable({
    providedIn: 'root'
})
export class ClientRepositoryExtensions {

    constructor(private clientRepository: ClientRepository) { }

    /**
     * Get paginated clients for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param page Page number (zero-indexed)
     * @param size Number of items per page
     * @param filters Optional filters (search query, quarter, date filter, etc.)
     * @returns Page of clients
     */
    async findByCommercialPaginated(
        commercialUsername: string,
        page: number,
        size: number,
        filters?: ClientRepositoryFilters
    ): Promise<Page<Client>> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot query clients without commercial filter');
        }

        const offset = page * size;

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('client');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialUsername];

        // Add optional filters
        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');

        // Count total items
        const countSql = `SELECT COUNT(*) as total FROM clients WHERE ${whereClause}`;
        const countResult = await this.clientRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Get paginated data
        const dataSql = `SELECT * FROM clients WHERE ${whereClause} ORDER BY fullName ASC LIMIT ${size} OFFSET ${offset}`;
        const dataResult = await this.clientRepository['getDatabaseService']().query(dataSql, params);
        const content = (dataResult.values || []) as Client[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    /**
     * Get paginated client views (with account info) for a specific commercial
     * 
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of ClientView
     */
    async findViewsByCommercialPaginated(
        commercialUsername: string,
        page: number,
        size: number,
        filters?: ClientRepositoryFilters
    ): Promise<Page<ClientView>> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot query client views without commercial filter');
        }

        const offset = page * size;

        // Use regex or helper if possible, but for JOIN we need aliases.
        // Explicitly using alias 'c' for client table
        let whereConditions = [`c.commercial = ?`];
        const params: any[] = [commercialUsername];

        // Add optional filters with aliases
        if (filters?.searchQuery) {
            whereConditions.push('(c.fullName LIKE ? OR c.phone LIKE ? OR c.quarter LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (filters?.quarter) {
            whereConditions.push('c.quarter = ?');
            params.push(filters.quarter);
        }

        if (filters?.clientType) {
            whereConditions.push('c.clientType = ?');
            params.push(filters.clientType);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'c.createdAt');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        if (filters?.isLocal !== undefined) {
            whereConditions.push('c.isLocal = ?');
            params.push(filters.isLocal ? 1 : 0);
        }

        if (filters?.isSync !== undefined) {
            whereConditions.push('c.isSync = ?');
            params.push(filters.isSync ? 1 : 0);
        }

        const whereClause = whereConditions.join(' AND ');

        // Count
        const countSql = `SELECT COUNT(*) as total FROM clients c WHERE ${whereClause}`;
        const countResult = await this.clientRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Data with JOIN
        const dataSql = `
            SELECT c.*, 
                   a.id as accountId,
                   a.accountBalance, 
                   a.accountNumber, 
                   a.status as accountStatus 
            FROM clients c 
            LEFT JOIN accounts a ON c.id = a.clientId
            WHERE ${whereClause} 
            ORDER BY c.fullName ASC 
            LIMIT ${size} OFFSET ${offset}
        `;

        const dataResult = await this.clientRepository['getDatabaseService']().query(dataSql, params);
        const rows = (dataResult.values || []) as any[];

        // Map to ClientView
        const content: ClientView[] = rows.map(row => {
            const client = { ...row };

            const account: Account = {
                id: row.accountId || '',
                accountNumber: row.accountNumber,
                accountBalance: row.accountBalance,
                status: row.accountStatus,
                clientId: row.id,
            } as any;

            return {
                ...client,
                account: row.accountNumber ? account : undefined
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
     * Count clients for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total count of clients
     */
    async countByCommercial(
        commercialUsername: string,
        filters?: ClientRepositoryFilters
    ): Promise<number> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot count clients without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('client');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialUsername];

        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as total FROM clients WHERE ${whereClause}`;
        const result = await this.clientRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Count clients with active credit for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param dateFilter Optional date filter
     * @returns Count of clients with active credit
     */
    async countWithActiveCreditByCommercial(
        commercialUsername: string,
        dateFilter?: DateFilter
    ): Promise<number> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot count clients without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('client');
        let whereConditions = [commercialCondition, 'creditInProgress = 1'];
        const params: any[] = [commercialUsername];

        // Add date filter using helper function
        if (dateFilter) {
            const dateFilterResult = buildDateFilterClause(dateFilter, 'createdAt');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }

        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as total FROM clients WHERE ${whereClause}`;
        const result = await this.clientRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    // Helper to apply common filters
    private applyFilters(whereConditions: string[], params: any[], filters?: any) {
        if (filters?.searchQuery) {
            whereConditions.push('(fullName LIKE ? OR phone LIKE ? OR quarter LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (filters?.quarter) {
            whereConditions.push('quarter = ?');
            params.push(filters.quarter);
        }

        if (filters?.clientType) {
            whereConditions.push('clientType = ?');
            params.push(filters.clientType);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'createdAt');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
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
