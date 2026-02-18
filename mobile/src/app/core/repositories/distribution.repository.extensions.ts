/**
 * Distribution Repository Extensions
 * 
 * This file contains pagination-specific methods for the DistributionRepository.
 * All methods enforce commercial-level data isolation.
 */

import { Injectable } from '@angular/core';
import { DistributionRepository } from './distribution.repository';
import { Distribution } from '../../models/distribution.model';
import { Page } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';
import { DateFilter, buildDateFilterClause } from '../models/date-filter.model';

/**
 * Extended pagination methods for DistributionRepository
 */
@Injectable({
    providedIn: 'root'
})
export class DistributionRepositoryExtensions {
    
    constructor(private distributionRepository: DistributionRepository) {}

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
        filters?: {
            status?: string;
            dateFilter?: DateFilter;
            clientId?: string;
        }
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
        if (filters?.status) {
            whereConditions.push('status = ?');
            params.push(filters.status);
        }
        
        // Add date filter using helper function
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
        filters?: {
            status?: string;
            dateFilter?: DateFilter;
        }
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot count distributions without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('distribution');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];
        
        // Add optional filters
        if (filters?.status) {
            whereConditions.push('status = ?');
            params.push(filters.status);
        }
        
        // Add date filter using helper function
        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'createdAt');
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
        filters?: {
            status?: string;
            dateFilter?: DateFilter;
        }
    ): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot calculate distribution amount without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('distribution');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialId];
        
        // Add optional filters
        if (filters?.status) {
            whereConditions.push('status = ?');
            params.push(filters.status);
        }
        
        // Add date filter using helper function
        if (filters?.dateFilter) {
            const dateFilterResult = buildDateFilterClause(filters.dateFilter, 'createdAt');
            if (dateFilterResult.whereClause) {
                whereConditions.push(dateFilterResult.whereClause);
                params.push(...dateFilterResult.params);
            }
        }
        
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
}
