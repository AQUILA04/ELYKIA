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
     * @param filters Optional filters (status, date range, etc.)
     * @returns Page of distributions
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
        const countSql = `SELECT COUNT(*) as total FROM distributions WHERE ${whereClause}`;
        const countResult = await this.distributionRepository['getDatabaseService']().query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);
        
        // Get paginated data
        const dataSql = `SELECT * FROM distributions WHERE ${whereClause} ORDER BY startDate DESC LIMIT ${size} OFFSET ${offset}`;
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
            startDate?: string;
            endDate?: string;
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
        
        if (filters?.startDate) {
            whereConditions.push('DATE(startDate) >= ?');
            params.push(filters.startDate);
        }
        
        if (filters?.endDate) {
            whereConditions.push('DATE(endDate) <= ?');
            params.push(filters.endDate);
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
            startDate?: string;
            endDate?: string;
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
        
        if (filters?.startDate) {
            whereConditions.push('DATE(startDate) >= ?');
            params.push(filters.startDate);
        }
        
        if (filters?.endDate) {
            whereConditions.push('DATE(endDate) <= ?');
            params.push(filters.endDate);
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
     * @returns Count of active distributions
     */
    async countActiveByCommercial(commercialId: string): Promise<number> {
        if (!commercialId) {
            throw new Error('commercialId is required for security - cannot count active distributions without commercial filter');
        }

        const commercialCondition = buildCommercialFilterCondition('distribution');
        const sql = `SELECT COUNT(*) as total FROM distributions WHERE ${commercialCondition} AND status = 'ACTIVE'`;
        const result = await this.distributionRepository['getDatabaseService']().query(sql, [commercialId]);
        
        return result.values?.[0]?.total || 0;
    }
}
