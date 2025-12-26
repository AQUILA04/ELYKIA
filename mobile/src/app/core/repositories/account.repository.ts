import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Account } from '../../models/account.model';
import { DatabaseService } from '../services/database.service';
import { capSQLiteSet } from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})
export class AccountRepository extends BaseRepository<Account, string> {
    protected tableName = 'accounts';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: Account[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        const keysToInclude = ['id', 'accountNumber', 'accountBalance', 'status'];
        const existingRows = await this.databaseService.query('SELECT id, syncHash FROM accounts');
        const existingAccountMap = new Map<string, string>(
            existingRows.values?.map((row: any) => [String(row.id), row.syncHash]) ?? []
        );

        const accountsToInsert: capSQLiteSet[] = [];
        const accountsToUpdate: capSQLiteSet[] = [];
        const now = new Date().toISOString();

        for (const acc of entities) {
            if (!acc || acc.id === undefined) {
                continue;
            }
            const accountIdStr = String(acc.id);

            const accountBalance = acc.accountBalance ?? (acc as any).balance ?? 0;
            const clientId = acc.clientId ?? (acc as any).client?.id;
            const clientIdStr = String(clientId);
            if (clientId === undefined) {
                continue;
            }

            const normalizedAcc = { ...acc, accountBalance, clientId };
            const newHash = this.generateHash(normalizedAcc, keysToInclude);

            const isExisting = existingAccountMap.has(accountIdStr);
            const needsUpdate = isExisting && existingAccountMap.get(accountIdStr) !== newHash;

            const isNumericId = /^[0-9]+$/.test(accountIdStr);
            const IS_SYNC = isNumericId ? 1 : 0;

            if (needsUpdate) {
                const sql = `UPDATE accounts SET accountNumber = ?, accountBalance = ?, status = ?, clientId = ?, isLocal = ?, isSync = ?, syncDate = ?, syncHash = ?, old_balance = ?, updated = ?, createdAt = ? WHERE id = ?`;
                const updateParams = [
                    acc.accountNumber ?? null,
                    accountBalance,
                    acc.status ?? null,
                    clientIdStr,
                    acc.isLocal ? 1 : 0,
                    IS_SYNC,
                    now,
                    newHash,
                    acc.old_balance ?? null,
                    acc.updated ? 1 : 0,
                    acc.createdAt ?? now,
                    accountIdStr
                ];
                accountsToUpdate.push({ statement: sql, values: updateParams });

            } else if (!isExisting) {
                const sql = `INSERT INTO accounts (id, accountNumber, accountBalance, status, clientId, isLocal, isSync, syncDate, syncHash, old_balance, updated, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                const insertParams = [
                    accountIdStr,
                    acc.accountNumber ?? null,
                    accountBalance,
                    acc.status ?? null,
                    clientIdStr,
                    acc.isLocal ? 1 : 0,
                    IS_SYNC,
                    now,
                    newHash,
                    null,
                    0,
                    acc.createdAt ?? now
                ];
                accountsToInsert.push({ statement: sql, values: insertParams });
            }
        }

        try {
            if (accountsToUpdate.length > 0) {
                await this.databaseService.executeSet(accountsToUpdate);
            }

            if (accountsToInsert.length > 0) {
                await this.databaseService.executeSet(accountsToInsert);
            }
        } catch (error) {
            console.error('Failed to save accounts in repository.', error);
            throw error;
        }
    }


}
