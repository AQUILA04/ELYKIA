import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Article } from '../../models/article.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';
import { Page } from './repository.interface';

export interface ArticleCatalogueFilters {
  searchQuery?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ArticleRepository extends BaseRepository<Article, string> {
    protected tableName = 'articles';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    private resolveState(article: Article, existingState?: string | null): string {
        const incoming = article.state || article.status;
        if (incoming) {
            return String(incoming);
        }
        if (existingState) {
            return String(existingState);
        }
        return 'ENABLED';
    }

    async saveAll(entities: Article[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = [
            'id', 'name', 'commercialName', 'creditSalePrice', 'stockQuantity', 'state'
        ];

        const existingRows = await this.databaseService.query(
            'SELECT id, syncHash, stockQuantity, state FROM articles'
        );
        const existingArticleMap = new Map<string, { syncHash: string; stockQuantity: number; state: string | null }>(
            existingRows.values?.map((row: any) => [
                String(row.id),
                {
                    syncHash: row.syncHash,
                    stockQuantity: row.stockQuantity ?? 0,
                    state: row.state ?? null
                }
            ]) ?? []
        );

        const articlesToInsert: any[][] = [];
        const articlesToUpdate: any[][] = [];
        const processedIds = new Set<string>();
        const now = new Date().toISOString();

        for (const article of entities) {
            if (!article || article.id === undefined || article.id === null) {
                continue;
            }

            const articleIdStr = String(article.id);

            if (processedIds.has(articleIdStr)) {
                continue;
            }

            const existing = existingArticleMap.get(articleIdStr);
            const isExisting = !!existing;
            const resolvedState = this.resolveState(article, existing?.state);
            const resolvedStock = article.stockQuantity ?? (existing?.stockQuantity ?? 0);
            const articleForHash: Article = {
                ...article,
                id: articleIdStr,
                state: resolvedState,
                stockQuantity: resolvedStock
            };
            const newHash = this.generateHash(articleForHash, keysToInclude);
            const needsUpdate = isExisting && existing!.syncHash !== newHash;

            if (needsUpdate) {
                const updateParams = [
                    article.name, article.commercialName, article.marque, article.model,
                    article.type, article.creditSalePrice, resolvedStock, resolvedState,
                    1, now, newHash, articleIdStr
                ];
                articlesToUpdate.push(updateParams);
                processedIds.add(articleIdStr);
            } else if (!isExisting) {
                const insertParams = [
                    articleIdStr, article.name, article.commercialName, article.marque,
                    article.model, article.type, article.creditSalePrice,
                    resolvedStock, resolvedState, 1, now, newHash
                ];
                articlesToInsert.push(insertParams);
                processedIds.add(articleIdStr);
            }
        }

        try {
            if (articlesToUpdate.length > 0) {
                const updateSet: capSQLiteSet[] = [];
                const sql = `UPDATE articles SET
                    name = ?, commercialName = ?, marque = ?, model = ?,
                    type = ?, creditSalePrice = ?, stockQuantity = ?, state = ?,
                    isSync = ?, lastUpdate = ?, syncHash = ?
                   WHERE id = ?`;
                for (const params of articlesToUpdate) {
                    updateSet.push({ statement: sql, values: params });
                }
                await this.databaseService.executeSet(updateSet);
            }

            if (articlesToInsert.length > 0) {
                const insertSet: capSQLiteSet[] = [];
                const sql = `INSERT INTO articles (
                    id, name, commercialName, marque, model, type,
                    creditSalePrice, stockQuantity, state, isSync, lastUpdate, syncHash
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                for (const params of articlesToInsert) {
                    insertSet.push({ statement: sql, values: params });
                }
                await this.databaseService.executeSet(insertSet);
            }
        } catch (error) {
            console.error('Failed to save articles in repository.', error);
            throw error;
        }
    }

    /**
     * Mark local ENABLED (or null) articles that are not in the enabled ID set as DISABLED.
     * Keeps rows in DB for distribution / historical references.
     */
    async markMissingEnabledAsDisabled(enabledIds: string[]): Promise<void> {
        const enabledSet = new Set(enabledIds.map(id => String(id)));
        const rows = await this.databaseService.query(
            `SELECT id FROM ${this.tableName} WHERE COALESCE(state, 'ENABLED') = 'ENABLED'`
        );
        const toDisable = (rows.values || [])
            .map((row: any) => String(row.id))
            .filter((id: string) => !enabledSet.has(id));

        if (toDisable.length === 0) {
            return;
        }

        const now = new Date().toISOString();
        const chunkSize = 400;
        for (let i = 0; i < toDisable.length; i += chunkSize) {
            const chunk = toDisable.slice(i, i + chunkSize);
            const placeholders = chunk.map(() => '?').join(',');
            await this.databaseService.execute(
                `UPDATE ${this.tableName} SET state = 'DISABLED', lastUpdate = ?, isSync = 1
                 WHERE id IN (${placeholders})`,
                [now, ...chunk]
            );
        }
    }

    async searchArticles(query: string, page: number, size: number): Promise<Page<Article>> {
        const offset = page * size;
        const searchTerm = `%${query}%`;

        const countSql = `SELECT COUNT(*) as total FROM ${this.tableName}
                         WHERE name LIKE ? OR commercialName LIKE ?`;

        const dataSql = `SELECT * FROM ${this.tableName}
                        WHERE name LIKE ? OR commercialName LIKE ?
                        LIMIT ${size} OFFSET ${offset}`;

        const countResult = await this.databaseService.query(countSql, [searchTerm, searchTerm]);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        const dataResult = await this.databaseService.query(dataSql, [searchTerm, searchTerm]);
        const content = (dataResult.values || []) as Article[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    /**
     * Catalogue = articles actifs (ENABLED). Disabled stay in DB but are excluded here.
     */
    async searchCatalogueArticles(
        page: number,
        size: number,
        filters?: ArticleCatalogueFilters
    ): Promise<Page<Article>> {
        const offset = page * size;
        const query = (filters?.searchQuery || '').trim();
        const searchTerm = `%${query}%`;

        const whereParts = [`COALESCE(state, 'ENABLED') = 'ENABLED'`];
        const params: any[] = [];

        if (query) {
            whereParts.push(`(name LIKE ? OR commercialName LIKE ? OR marque LIKE ? OR type LIKE ?)`);
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const whereSql = whereParts.join(' AND ');

        const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${whereSql}`;
        const dataSql = `SELECT * FROM ${this.tableName}
                        WHERE ${whereSql}
                        ORDER BY COALESCE(commercialName, name) COLLATE NOCASE ASC
                        LIMIT ${size} OFFSET ${offset}`;

        const countResult = await this.databaseService.query(countSql, params);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size) || 0;

        const dataResult = await this.databaseService.query(dataSql, params);
        const content = (dataResult.values || []) as Article[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    /**
     * Find multiple articles by their IDs
     * @param ids Array of article IDs
     * @returns Array of found articles
     */
    async findByIds(ids: string[]): Promise<Article[]> {
        if (!ids || ids.length === 0) {
            return [];
        }

        // Remove duplicates
        const uniqueIds = [...new Set(ids)];

        const placeholders = uniqueIds.map(() => '?').join(',');
        const sql = `SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})`;

        const result = await this.databaseService.query(sql, uniqueIds);
        return (result.values || []) as Article[];
    }
}
