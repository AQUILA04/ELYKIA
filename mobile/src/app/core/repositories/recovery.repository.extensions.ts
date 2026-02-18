/**
 * Recovery Repository Extensions
 * 
 * This file contains pagination-specific methods for the RecoveryRepository.
 * All methods enforce commercial-level data isolation.
 */

import { Injectable } from '@angular/core';
import { RecoveryRepository } from './recovery.repository';
import { Recovery } from '../../models/recovery.model';
import { Page } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';

/**
 * Extended pagination methods for RecoveryRepository
 */
@Injectable({
    providedIn: 'root'
})
export class RecoveryRepositoryExtensions {
    
    constructor(private recoveryRepository: RecoveryRepository) {}

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
        filters?: {
            dateFilter?: DateFilter;
            paymentMethod?: string;
            clientId?: string;
        }
    ): Promise<Page<Recovery>> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot query recoveries without commercial filter');
        }

        const offset = page * size;
        
        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('recovery');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];
        
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
        
        // Add date filter using helper function
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
        
        // Add date filter using helper function
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
        
        // Add date filter using helper function
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
}
