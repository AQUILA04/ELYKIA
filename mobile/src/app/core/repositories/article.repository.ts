import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Article } from '../../models/article.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';
import { Page } from './repository.interface';

@Injectable({
    providedIn: 'root'
})
export class ArticleRepository extends BaseRepository<Article, string> {
    protected tableName = 'articles';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Article[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = [
            'id', 'name', 'commercialName', 'creditSalePrice', 'stockQuantity'
        ];

        const existingRows = await this.databaseService.query('SELECT id, syncHash FROM articles');
        const existingArticleMap = new Map<string, string>(
            existingRows.values?.map((row: any) => [String(row.id), row.syncHash]) ?? []
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

            // Accessing private method via 'any' cast or duplicating logic.
            // Since generateHash is private in DatabaseService, I should probably implement a helper or duplicate it.
            // For now, I will duplicate the simple hash logic to keep repositories self-contained as requested.
            const newHash = this.generateHash(article, keysToInclude);

            const isExisting = existingArticleMap.has(articleIdStr);
            const needsUpdate = isExisting && existingArticleMap.get(articleIdStr) !== newHash;

            if (needsUpdate) {
                const updateParams = [
                    article.name, article.commercialName, article.marque, article.model,
                    article.type, article.creditSalePrice, article.stockQuantity,
                    1, now, newHash, articleIdStr
                ];
                articlesToUpdate.push(updateParams);
                processedIds.add(articleIdStr);
            } else if (!isExisting) {
                const insertParams = [
                    articleIdStr, article.name, article.commercialName, article.marque,
                    article.model, article.type, article.creditSalePrice,
                    article.stockQuantity, 1, now, newHash
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
                    type = ?, creditSalePrice = ?, stockQuantity = ?,
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
                    creditSalePrice, stockQuantity, isSync, lastUpdate, syncHash
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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
}
