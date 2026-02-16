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

/**
 * Extended pagination methods for ClientRepository
 */
@Injectable({
    providedIn: 'root'
})
export class ClientRepositoryExtensions {
    
    constructor(private clientRepository: ClientRepository) {}

    /**
     * Get paginated clients for a specific commercial
     * 
     * **SECURITY**: This method ALWAYS filters by commercial to ensure data isolation
     * 
     * @param commercialUsername Username of the commercial (REQUIRED)
     * @param page Page number (zero-indexed)
     * @param size Number of items per page
     * @param filters Optional filters (search query, quarter, etc.)
     * @returns Page of clients
     */
    async findByCommercialPaginated(
        commercialUsername: string,
        page: number,
        size: number,
        filters?: {
            searchQuery?: string;
            quarter?: string;
            clientType?: string;
        }
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
        filters?: {
            searchQuery?: string;
            quarter?: string;
            clientType?: string;
        }
    ): Promise<number> {
        if (!commercialUsername) {
            throw new Error('commercialUsername is required for security - cannot count clients without commercial filter');
        }

        // Build WHERE clause with MANDATORY commercial filter
        const commercialCondition = buildCommercialFilterCondition('client');
        let whereConditions = [commercialCondition];
        const params: any[] = [commercialUsername];
        
        // Add optional filters
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
        
        const whereClause = whereConditions.join(' AND ');
        const sql = `SELECT COUNT(*) as total FROM clients WHERE ${whereClause}`;
        const result = await this.clientRepository['getDatabaseService']().query(sql, params);
        
        return result.values?.[0]?.total || 0;
    }
}
