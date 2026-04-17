import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { LoggerService } from './logger.service';

export interface SyncArchiveResult {
  archived: number;
}

@Injectable({
  providedIn: 'root'
})
export class SyncArchiveService {

  constructor(
    private databaseService: DatabaseService,
    private loggerService: LoggerService
  ) { }

  async archiveOldErrors(): Promise<SyncArchiveResult> {
    try {
      await this.createArchiveTableIfNeeded();

      const countResult = await this.databaseService.query('SELECT COUNT(*) as count FROM sync_logs');
      const rowCount = countResult.values?.[0]?.count || 0;

      if (rowCount === 0) {
        return { archived: 0 };
      }

      await this.databaseService.execute(`
        INSERT INTO sync_logs_archive (
          id, entityType, entityId, operation, status, errorCode,
          requestData, responseData, entityDisplayName, entityDetails,
          errorMessage, syncDate, retryCount, archivedAt
        )
        SELECT 
          id, entityType, entityId, operation, status, errorCode,
          requestData, responseData, entityDisplayName, entityDetails,
          errorMessage, syncDate, retryCount, CURRENT_TIMESTAMP
        FROM sync_logs
      `);

      await this.databaseService.execute('DELETE FROM sync_logs');

      await this.loggerService.log(`Archived ${rowCount} rows from sync_logs to sync_logs_archive`);

      return { archived: rowCount };
    } catch (error) {
      await this.loggerService.error('Error archiving sync logs', error);
      return { archived: 0 };
    }
  }

  private async createArchiveTableIfNeeded(): Promise<void> {
    await this.databaseService.execute(`
      CREATE TABLE IF NOT EXISTS sync_logs_archive (
        id TEXT PRIMARY KEY,
        entityType TEXT,
        entityId TEXT,
        operation TEXT,
        status TEXT,
        errorCode TEXT,
        requestData TEXT,
        responseData TEXT,
        entityDisplayName TEXT,
        entityDetails TEXT,
        errorMessage TEXT,
        syncDate DATETIME,
        retryCount INTEGER DEFAULT 0,
        archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}