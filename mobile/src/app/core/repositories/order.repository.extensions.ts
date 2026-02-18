/**
 * Order Repository Extensions
 * 
 * This file contains pagination-specific methods for the OrderRepository.
 * All methods enforce commercial-level data isolation.
 */

import { Injectable } from '@angular/core';
import { OrderRepository } from './order.repository';
import { Order } from '../../models/order.model';
import { Page, RepositoryViewFilters } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';
import { OrderView } from '../../models/order-view.model';

export interface OrderRepositoryFilters extends RepositoryViewFilters {
    status?: string;
    clientId?: string;
}

export interface OrderRepositoryFilters extends RepositoryViewFilters {
    status?: string;
    clientId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class OrderRepositoryExtensions {

    constructor(private orderRepository: OrderRepository) { }

    /**
     * Get paginated orders (views) for a specific commercial
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of OrderView
     */
    async findViewsByCommercialPaginated(
        commercialId: string,
        page: number,
        size: number,
        filters?: OrderRepositoryFilters
    ): Promise<Page<OrderView>> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot query order views without commercial filter');
        }

        const offset = page * size;

        // Use 'o' for order, 'c' for client

        // Commercial filter: Order has `commercialId`
        let whereConditions = [`o.commercialId = ?`];
        const params: any[] = [commercialId];

        // Add optional filters
        this.applyFilters(whereConditions, params, filters);

        const whereClause = whereConditions.join(' AND ');

        // Count with JOIN
        const countSql = `
            SELECT COUNT(*) as total 
            FROM orders o 
            LEFT JOIN clients c ON o.clientId = c.id
            WHERE ${whereClause}
        `;
        const countResult = await this.orderRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        // Data with JOIN
        const dataSql = `
            SELECT o.*, 
                   c.fullName as clientName, 
                   c.quarter as clientQuarter,
                   c.phone as clientPhone
            FROM orders o 
            LEFT JOIN clients c ON o.clientId = c.id
            WHERE ${whereClause} 
            ORDER BY o.createdAt DESC 
            LIMIT ${size} OFFSET ${offset}
        `;

        const dataResult = await this.orderRepository['getDatabaseService']().query(dataSql, params);
        const rows = (dataResult.values || []) as any[];

        const content: OrderView[] = rows.map(row => {
            return {
                ...row,
                isLocal: !!row.isLocal,
                isSync: !!row.isSync,
                clientName: row.clientName || 'Inconnu',
                clientQuarter: row.clientQuarter,
                clientPhone: row.clientPhone,
                items: [] // Items are usually loaded separately or strictly needed for list? 
                // If needed, we'd need another query or JSON_GROUP_ARRAY (complex in sqlite versions)
                // For list view, usually items count or total amount is enough.
                // Order model has `articleCount`.
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

    private applyFilters(whereConditions: string[], params: any[], filters?: any) {
        if (filters?.status) {
            whereConditions.push('o.status = ?');
            params.push(filters.status);
        }

        if (filters?.clientId) {
            whereConditions.push('o.clientId = ?');
            params.push(filters.clientId);
        }

        if (filters?.searchQuery) {
            // Search client name or order reference
            whereConditions.push('(c.fullName LIKE ? OR o.reference LIKE ?)');
            const searchPattern = `%${filters.searchQuery}%`;
            params.push(searchPattern, searchPattern);
        }

        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'o.createdAt');
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
            whereConditions.push('o.isLocal = ?');
            params.push(filters.isLocal ? 1 : 0);
        }

        if (filters?.isSync !== undefined) {
            whereConditions.push('o.isSync = ?');
            params.push(filters.isSync ? 1 : 0);
        }
    }

    /**
     * Count orders for a specific commercial
     * 
     * @param commercialId ID of the commercial
     * @returns Total count of orders
     */
    async countByCommercial(commercialId: string): Promise<number> {
        if (!commercialId) {
            return 0;
        }
        const sql = `SELECT COUNT(*) as total FROM orders WHERE commercialId = ?`;
        const result = await this.orderRepository['getDatabaseService']().query(sql, [commercialId]);
        return result.values?.[0]?.total || 0;
    }
}
