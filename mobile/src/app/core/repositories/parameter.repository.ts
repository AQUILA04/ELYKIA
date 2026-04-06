import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Parameter } from '../../models/parameter.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class ParameterRepository extends BaseRepository<Parameter, string> {
    protected tableName = 'parameters';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Parameter[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const query = `
            INSERT OR REPLACE INTO parameters (key, value, description, syncDate)
            VALUES (?, ?, ?, ?)
        `;

        const set: capSQLiteSet[] = entities.map(p => ({
            statement: query,
            values: [p.key, p.value, p.description, new Date().toISOString()]
        }));

        await this.databaseService.executeSet(set);
    }

    async getByKey(key: string): Promise<string | null> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }
        const result = await this.databaseService.query('SELECT value FROM parameters WHERE key = ?', [key]);
        return result.values?.[0]?.value || null;
    }
}
