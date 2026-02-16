/**
 * Order Repository Extensions
 * 
 * This file contains pagination-specific methods for the OrderRepository.
 * All methods enforce commercial-level data isolation.
 */

import { Injectable } from '@angular/core';
import { OrderRepository } from './order.repository';
import { Order } from '../../models/order.model';
import { Page } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';

/**
 * Extended pagination methods for OrderRepository
 */
@Injectable({
    providedIn: 'root'
})
export class OrderRepositoryExtensions {
    
    constructor(private orderRepository: OrderRepository) {}

    /**
     * Get paginated orders for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param page Page number (zero-indexed)
     * @param size Number of items per page
     * @param filters Optional filters (status, date range, etc.)
     * @returns Page of orders
     */
    async findByCommercialPaginated(
        commercialId: string,
        page: number,
        size: number,
        filters?: {
            status?: string;
            startDate?: string;
            endDate?: string;
            clientId?: string;
        }
    ): Promise<Page<Order>> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot query orders without commercial filter');
        }

        const offset = page * size;
        
        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('order');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];
        
        // Add optional filters
        if (filters?.status) {
            whereConditions.push('status = ?');
            params.push(filters.status);
        }
        
        if (filters?.startDate) {
            whereConditions.push('DATE(startDate) >= ?');
            params.push(filters.startDate);
        }
        
        if (filters?.endDate) {
            whereConditions.push('DATE(endDate) <= ?');
            params.push(filters.endDate);
        }
        
        if (filters?.clientId) {
            whereConditions.push('clientId = ?');
            params.push(filters.clientId);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Count total items
        const countSql = `SELECT COUNT(*) as total FROM orders WHERE ${whereClause}`;
        const countResult = await this.orderRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);
        
        // Get paginated data
        const dataSql = `SELECT * FROM orders WHERE ${whereClause} ORDER BY startDate DESC LIMIT ${size} OFFSET ${offset}`;
        const dataResult = await this.orderRepository['getDatabaseService']().query(dataSql, params);
        const content = (dataResult.values || []) as Order[];
        
        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    /**
     * Count orders for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialId ID of the commercial (REQUIRED)
     * @param filters Optional filters
     * @returns Total count of orders
     */
    async countByCommercial(
        commercialId: string,
        filters?: {
            status?: string;
            startDate?: string;
            endDate?: string;
        }
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot count orders without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('order');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];
        
        // Add optional filters
        if (filters?.status) {
            whereConditions.push('status = ?');
            params.push(filters.status);
        }
        
        if (filters?.startDate) {
            whereConditions.push('DATE(startDate) >= ?');
            params.push(filters.startDate);
        }
        
        if (filters?.endDate) {
            whereConditions.push('DATE(endDate) <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as total FROM orders WHERE ${whereClause}`;
        const result = await this.orderRepository['getDatabaseService']().query(sql, params);
        
        return result.values?.[0]?.total || 0;
    }
}
