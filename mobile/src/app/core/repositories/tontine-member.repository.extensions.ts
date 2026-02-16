/**
 * Tontine Member Repository Extensions
 * 
 * This file contains pagination-specific methods for the TontineMemberRepository.
 * All methods enforce commercial-level data isolation.
 */

import { Injectable } from '@angular/core';
import { TontineMemberRepository } from './tontine-member.repository';
import { TontineMember } from '../../models/tontine.model';
import { Page } from './repository.interface';
import { buildCommercialFilterCondition } from '../constants/commercial-filter.config';

/**
 * Extended pagination methods for TontineMemberRepository
 */
@Injectable({
    providedIn: 'root'
})
export class TontineMemberRepositoryExtensions {
    
    constructor(private tontineMemberRepository: TontineMemberRepository) {}

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
        filters?: {
            deliveryStatus?: string;
        }
    ): Promise<Page<any>> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot query tontine members without commercial filter');
        }

        const offset = page * size;
        const today = new Date().toISOString().split('T')[0];
        
        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('tontineMember', 'tm');
        let whereConditions = ['tm.tontineSessionId = ?', commercialCondition];
        const params: any[] = [sessionId, commercialUsername];
        
        if (filters?.deliveryStatus) {
            whereConditions.push('tm.deliveryStatus = ?');
            params.push(filters.deliveryStatus);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Count total items
        const countSql = `SELECT COUNT(*) as total FROM tontine_members tm WHERE ${whereClause}`;
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
        
        const dataParams = [today, ...params];
        const dataResult = await this.tontineMemberRepository['getDatabaseService']().query(dataSql, dataParams);
        const content = (dataResult.values || []);
        
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
        filters?: {
            deliveryStatus?: string;
        }
    ): Promise<number> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot count tontine members without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('tontineMember');
        let whereConditions = ['tontineSessionId = ?', commercialCondition];
        const params: any[] = [sessionId, commercialUsername];
        
        if (filters?.deliveryStatus) {
            whereConditions.push('deliveryStatus = ?');
            params.push(filters.deliveryStatus);
        }
        
        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as total FROM tontine_members WHERE ${whereClause}`;
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

        const commercialCondition = buildCommercialFilterCondition('tontineMember');
        const sql = `
            SELECT COUNT(*) as total 
            FROM tontine_members 
            WHERE tontineSessionId = ? AND ${commercialCondition} AND deliveryStatus = 'PENDING'
        `;
        const result = await this.tontineMemberRepository['getDatabaseService']().query(sql, [sessionId, commercialUsername]);
        
        return result.values?.[0]?.total || 0;
    }
}
