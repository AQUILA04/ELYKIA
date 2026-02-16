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
}
