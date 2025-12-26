import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Commercial } from '../../models/commercial.model';
import { DatabaseService } from '../services/database.service';

@Injectable({
    providedIn: 'root'
})
export class CommercialRepository extends BaseRepository<Commercial, string> {
    protected tableName = 'commercials';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Commercial[]): Promise<void> {
        // Commercial logic in DatabaseService is 'saveCommercial' (singular).
        // I will loop and call save for each or implement batch if possible.
        // DatabaseService.saveCommercial uses upsert logic with check.

        for (const commercial of entities) {
            const keysToInclude = ['id', 'username', 'fullName', 'phone', 'email', 'profilePhoto'];
            const newHash = this.generateHash(commercial, keysToInclude);

            const existingCommercial = await this.databaseService.query(`SELECT syncHash FROM commercials WHERE id = '${commercial.id}'`);
            const existingHash = existingCommercial.values?.[0]?.syncHash;

            if (existingHash !== undefined) {
                if (existingHash !== newHash) {
                    const sql = `UPDATE commercials SET username = ?, fullName = ?, email = ?, phone = ?, profilePhoto = ?, isSync = 1, syncDate = ?, syncHash = ? WHERE id = ?`;
                    await this.databaseService.execute(sql, [commercial.username, commercial.fullName, commercial.email, commercial.phone, commercial.profilePhoto, new Date().toISOString(), newHash, commercial.id]);
                }
            } else {
                // Check if ID exists but maybe hash was missing? Logic in DBService checks ID again.
                const existingIdCheck = await this.databaseService.query(`SELECT id FROM commercials WHERE id = '${commercial.id}'`);
                if (existingIdCheck.values && existingIdCheck.values.length > 0) {
                    const sql = `UPDATE commercials SET username = ?, fullName = ?, email = ?, phone = ?, profilePhoto = ?, isSync = 1, syncDate = ?, syncHash = ? WHERE id = ?`;
                    await this.databaseService.execute(sql, [commercial.username, commercial.fullName, commercial.email, commercial.phone, commercial.profilePhoto, new Date().toISOString(), newHash, commercial.id]);
                } else {
                    const sql = `INSERT INTO commercials (id, username, fullName, email, phone, profilePhoto, isSync, syncDate, syncHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    await this.databaseService.execute(sql, [commercial.id, commercial.username, commercial.fullName, commercial.email, commercial.phone, commercial.profilePhoto, 1, new Date().toISOString(), newHash]);
                }
            }
        }
    }


}
