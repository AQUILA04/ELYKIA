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
    hasCredit?: boolean;
    orderBy?: 'quarter' | 'name';
    tontineCollector?: string;
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

        if (filters?.hasCredit) {
            whereConditions.push('c.creditInProgress = 1');
        }

        const whereClause = whereConditions.join(' AND ');

        // Count
        const countSql = `SELECT COUNT(*) as total FROM clients c WHERE ${whereClause}`;
        const countResult = await this.clientRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        let orderByClause = 'ORDER BY c.fullName ASC';

        if (filters?.orderBy === 'quarter') {
            orderByClause = 'ORDER BY COALESCE(c.quarter, "ZZZ") ASC, c.fullName ASC';
        }

        const dataSql = `
            SELECT c.*,
                   a.id as accountId,
                   a.accountBalance,
                   a.accountNumber,
                   a.status as accountStatus
            FROM clients c
            LEFT JOIN accounts a ON c.id = a.clientId
            WHERE ${whereClause}
            ${orderByClause}
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
        const sql = `SELECT COUNT(*) as total FROM clients WHERE ${whereClause} `;
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
        const sql = `SELECT COUNT(*) as total FROM clients WHERE ${whereClause} `;
        const result = await this.clientRepository['getDatabaseService']().query(sql, params);

        return result.values?.[0]?.total || 0;
    }

    /**
     * Get account activity (new and updated accounts) for a specific commercial
     *
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     *
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param dateFilter Optional date filter
     * @returns Account activity stats
     */
    async getAccountActivityByCommercial(
        commercialUsername: string,
        dateFilter?: DateFilter
    ): Promise<{
        newClientsCount: number;
        newAccountsCount: number;
        newAccountsBalance: number;
        updatedAccountsCount: number;
        updatedAccountsBalance: number;
    }> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot calculate account activity without commercial filter');
        }

        const db = this.clientRepository['getDatabaseService']();
        const baseJoin = `JOIN clients c ON a.clientId = c.id`;

        // --- 1. New Clients Count (from clients table directly) ---
        let newClientsWhere = [`c.commercial = ?`];
        let newClientsParams: any[] = [commercialUsername];

        if (dateFilter) {
            const createdDateResult = buildDateFilterClause(dateFilter, 'c.createdAt');
            if (createdDateResult.whereClause) {
                newClientsWhere.push(createdDateResult.whereClause);
                newClientsParams.push(...createdDateResult.params);
            }
        }

        const newClientsCountSql = `
            SELECT COUNT(*) as count
            FROM clients c
            WHERE ${newClientsWhere.join(' AND ')}
        `;
        const newClientsCountResult = await db.query(newClientsCountSql, newClientsParams);

        // --- 2. New Accounts Query ---
        let newAccountsWhere = [`c.commercial = ?`];
        let newParams: any[] = [commercialUsername];

        if (dateFilter) {
            const createdDateResult = buildDateFilterClause(dateFilter, 'c.createdAt');
            if (createdDateResult.whereClause) {
                newAccountsWhere.push(createdDateResult.whereClause);
                newParams.push(...createdDateResult.params);
            }
        }

        const newSql = `
            SELECT COUNT(*) as count, COALESCE(SUM(a.accountBalance), 0) as balance
            FROM accounts a
            ${baseJoin}
            WHERE ${newAccountsWhere.join(' AND ')}
        `;
        const newResult = await db.query(newSql, newParams);

        // --- 3. Updated Accounts Query ---
        let updatedAccountsWhere = [`c.commercial = ?`, 'a.updated = 1', 'a.accountBalance > a.old_balance'];
        let updatedParams: any[] = [commercialUsername];

        if (dateFilter) {
            const syncDateResult = buildDateFilterClause(dateFilter, 'a.syncDate');
            if (syncDateResult.whereClause) {
                updatedAccountsWhere.push(syncDateResult.whereClause);
                updatedParams.push(...syncDateResult.params);
            }
        }

        const updatedSql = `
            SELECT COUNT(*) as count, COALESCE(SUM(a.accountBalance - a.old_balance), 0) as balanceDifference
            FROM accounts a
            ${baseJoin}
            WHERE ${updatedAccountsWhere.join(' AND ')}
        `;
        const updatedResult = await db.query(updatedSql, updatedParams);

        return {
            newClientsCount: newClientsCountResult.values?.[0]?.count || 0,
            newAccountsCount: newResult.values?.[0]?.count || 0,
            newAccountsBalance: newResult.values?.[0]?.balance || 0,
            updatedAccountsCount: updatedResult.values?.[0]?.count || 0,
            updatedAccountsBalance: updatedResult.values?.[0]?.balanceDifference || 0
        };
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
