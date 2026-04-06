import { DatabaseService } from '../services/database.service';
import { Repository, Page } from './repository.interface';

export abstract class BaseRepository<T, ID> implements Repository<T, ID> {
    protected abstract tableName: string;

    constructor(protected databaseService: DatabaseService) { }

    async save(entity: T): Promise<void> {
        return this.saveAll([entity]);
    }

    abstract saveAll(entities: T[]): Promise<void>;

    async findById(id: ID): Promise<T | null> {
        const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
        const result = await this.databaseService.query(sql, [id]);
        if (result && result.values && result.values.length > 0) {
            return result.values[0] as T;
        }
        return null;
    }

    async findAll(): Promise<T[]> {
        const sql = `SELECT * FROM ${this.tableName}`;
        const result = await this.databaseService.query(sql);
        return (result.values || []) as T[];
    }

    async findAllPaginated(page: number, size: number): Promise<Page<T>> {
        const offset = page * size;
        const countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
        const dataSql = `SELECT * FROM ${this.tableName} LIMIT ${size} OFFSET ${offset}`;

        const countResult = await this.databaseService.query(countSql);
        const totalElements = countResult.values?.[0]?.total || 0;
        const totalPages = Math.ceil(totalElements / size);

        const dataResult = await this.databaseService.query(dataSql);
        const content = (dataResult.values || []) as T[];

        return {
            content,
            totalElements,
            totalPages,
            page,
            size
        };
    }

    async delete(id: ID): Promise<void> {
        const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
        await this.databaseService.execute(sql, [id]);
    }

    protected generateHash(data: any, keysToInclude: string[]): string {
        const filteredData = keysToInclude.sort().reduce(
            (obj: { [key: string]: any }, key) => {
                obj[key] = data[key];
                return obj;
            },
            {}
        );
        return btoa(JSON.stringify(filteredData));
    }

    protected generateUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Get the database service instance
     * This method is provided for repository extensions that need direct database access
     * for complex queries (e.g., aggregations, KPI calculations)
     *
     * @returns DatabaseService instance
     */
    protected getDatabaseService(): DatabaseService {
        return this.databaseService;
    }

    // ==================== SYNC HELPER METHODS ====================

    /**
     * Get server ID for a local ID from id_mappings table
     */
    async getServerId(localId: string, entityType: string): Promise<string | null> {
        if (!localId) return null;
        const result = await this.databaseService.query(
            'SELECT serverId FROM id_mappings WHERE localId = ? AND entityType = ?',
            [localId, entityType]
        );
        if (result && result.values && result.values.length > 0) {
            return result.values[0].serverId;
        }
        // FALLBACK : si l'ID est déjà numérique, c'est un ID serveur direct
        // (entité reçue du serveur, pas de mapping nécessaire)
        if (/^\d+$/.test(localId)) {
            return localId;
        }
        return null;
    }

    /**
     * Save or update ID mapping
     */
    async saveIdMapping(localId: string, serverId: string, entityType: string): Promise<void> {
        await this.databaseService.execute(
            `INSERT OR REPLACE INTO id_mappings (localId, serverId, entityType, syncDate) VALUES (?, ?, ?, ?)`,
            [localId, serverId, entityType, new Date().toISOString()]
        );
    }

    /**
     * Update sync status of an entity
     */
    async updateSyncStatus(id: ID, isSync: boolean): Promise<void> {
        const syncDate = isSync ? new Date().toISOString() : null;
        await this.databaseService.execute(
            `UPDATE ${this.tableName} SET isSync = ?, syncDate = ? WHERE id = ?`,
            [isSync ? 1 : 0, syncDate, id]
        );
    }
    /**
     * Find unsynced entities (isSync = 0 AND isLocal = 1)
     * Subclasses should override this if they need to filter by commercialUsername
     */
    async findUnsynced(commercialUsername: string, limit: number, offset: number): Promise<T[]> {
        const sql = `SELECT * FROM ${this.tableName} WHERE isSync = 0 AND isLocal = 1 LIMIT ? OFFSET ?`;
        const result = await this.databaseService.query(sql, [limit, offset]);
        return (result.values || []) as T[];
    }

    /**
     * Count unsynced entities (isSync = 0 AND isLocal = 1)
     */
    async countUnsynced(): Promise<number> {
        const sql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE isSync = 0 AND isLocal = 1`;
        const result = await this.databaseService.query(sql);
        return result.values?.[0]?.total || 0;
    }

    /**
     * Count updated entities (isSync = 0 AND isLocal = 0)
     */
    async countUpdated(): Promise<number> {
        const sql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE isSync = 0 AND isLocal = 0`;
        const result = await this.databaseService.query(sql);
        return result.values?.[0]?.total || 0;
    }
}
