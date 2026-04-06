import { Injectable } from '@angular/core';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';

/**
 * Niveaux de log pour les opérations de synchronisation
 */
export enum SyncLogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

/**
 * Statut d'une opération de synchronisation
 */
export enum SyncOperationStatus {
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Entrée de log de synchronisation
 */
export interface SyncLogEntry {
  /** ID unique du log */
  id: string;
  /** ID de session de synchronisation */
  sessionId: string;
  /** Nom d'utilisateur du commercial */
  commercialUsername: string;
  /** Type d'opération (members, collections, stocks, cleanup, validation) */
  operationType: string;
  /** Statut de l'opération */
  status: SyncOperationStatus;
  /** Niveau de log */
  level: SyncLogLevel;
  /** Message descriptif */
  message: string;
  /** Contexte additionnel (JSON) */
  context?: string;
  /** Horodatage de l'opération */
  timestamp: Date;
  /** Durée de l'opération en millisecondes (optionnel) */
  duration?: number;
  /** Nombre d'éléments traités (optionnel) */
  itemsProcessed?: number;
  /** Message d'erreur (optionnel) */
  errorMessage?: string;
}

/**
 * Options de requête pour les logs
 */
export interface SyncLogQueryOptions {
  /** Filtrer par ID de session */
  sessionId?: string;
  /** Filtrer par nom d'utilisateur */
  commercialUsername?: string;
  /** Filtrer par type d'opération */
  operationType?: string;
  /** Filtrer par statut */
  status?: SyncOperationStatus;
  /** Filtrer par niveau */
  level?: SyncLogLevel;
  /** Date de début */
  startDate?: Date;
  /** Date de fin */
  endDate?: Date;
  /** Limite de résultats */
  limit?: number;
}

/**
 * Service de journalisation des opérations de synchronisation
 * 
 * Responsabilité: Maintenir un journal des opérations de synchronisation
 * avec horodatage et statut
 * 
 * Fonctionnalités:
 * - Journalisation des opérations avec horodatage et statut
 * - Persistance des logs dans SQLite
 * - Rotation automatique des logs (conservation des 30 derniers jours ou max 1000 entrées)
 * - Requêtes par date, statut, session ID
 * - Support de différents niveaux de log (INFO, WARNING, ERROR)
 * 
 * Valide l'exigence 4.5:
 * "LE Système_Sync DOIT maintenir un journal des opérations de synchronisation 
 * avec horodatage et statut"
 */
@Injectable({
  providedIn: 'root'
})
export class SyncLoggerService {
  private readonly MAX_LOG_ENTRIES = 1000;
  private readonly LOG_RETENTION_DAYS = 30;

  constructor(
    private dbService: DatabaseService,
    private log: LoggerService
  ) {
    this.initializeLogTable();
  }

  /**
   * Initialise la table de logs de synchronisation si elle n'existe pas
   */
  private async initializeLogTable(): Promise<void> {
    try {
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS sync_operation_logs (
          id TEXT PRIMARY KEY,
          sessionId TEXT NOT NULL,
          commercialUsername TEXT NOT NULL,
          operationType TEXT NOT NULL,
          status TEXT NOT NULL,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          context TEXT,
          timestamp DATETIME NOT NULL,
          duration INTEGER,
          itemsProcessed INTEGER,
          errorMessage TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_sync_logs_sessionId ON sync_operation_logs(sessionId);
        CREATE INDEX IF NOT EXISTS idx_sync_logs_timestamp ON sync_operation_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_operation_logs(status);
        CREATE INDEX IF NOT EXISTS idx_sync_logs_level ON sync_operation_logs(level);
      `;

      await this.dbService.execute(createTableSql);
      this.log.log('SyncLogger: Log table initialized');
    } catch (error: any) {
      this.log.error('SyncLogger: Failed to initialize log table', error);
    }
  }

  /**
   * Enregistre une opération de synchronisation
   * 
   * @param entry Entrée de log à enregistrer
   * @returns Promise de l'ID du log créé
   */
  async logOperation(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): Promise<string> {
    const logId = this.generateUuid();
    const timestamp = new Date();

    const fullEntry: SyncLogEntry = {
      id: logId,
      timestamp,
      ...entry
    };

    try {
      const sql = `
        INSERT INTO sync_operation_logs (
          id, sessionId, commercialUsername, operationType, status, level,
          message, context, timestamp, duration, itemsProcessed, errorMessage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        fullEntry.id,
        fullEntry.sessionId,
        fullEntry.commercialUsername,
        fullEntry.operationType,
        fullEntry.status,
        fullEntry.level,
        fullEntry.message,
        fullEntry.context || null,
        fullEntry.timestamp.toISOString(),
        fullEntry.duration || null,
        fullEntry.itemsProcessed || null,
        fullEntry.errorMessage || null
      ];

      await this.dbService.execute(sql, params);

      // Logger également dans le système de logs général
      this.logToGeneralLogger(fullEntry);

      // Déclencher la rotation automatique si nécessaire
      await this.rotateLogsIfNeeded();

      return logId;
    } catch (error: any) {
      this.log.error(`SyncLogger: Failed to log operation: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Enregistre le début d'une opération
   */
  async logOperationStart(
    sessionId: string,
    commercialUsername: string,
    operationType: string,
    message: string,
    context?: any
  ): Promise<string> {
    return this.logOperation({
      sessionId,
      commercialUsername,
      operationType,
      status: SyncOperationStatus.STARTED,
      level: SyncLogLevel.INFO,
      message,
      context: context ? JSON.stringify(context) : undefined
    });
  }

  /**
   * Enregistre le succès d'une opération
   */
  async logOperationSuccess(
    sessionId: string,
    commercialUsername: string,
    operationType: string,
    message: string,
    duration?: number,
    itemsProcessed?: number,
    context?: any
  ): Promise<string> {
    return this.logOperation({
      sessionId,
      commercialUsername,
      operationType,
      status: SyncOperationStatus.SUCCESS,
      level: SyncLogLevel.INFO,
      message,
      duration,
      itemsProcessed,
      context: context ? JSON.stringify(context) : undefined
    });
  }

  /**
   * Enregistre l'échec d'une opération
   */
  async logOperationFailure(
    sessionId: string,
    commercialUsername: string,
    operationType: string,
    message: string,
    errorMessage: string,
    duration?: number,
    context?: any
  ): Promise<string> {
    return this.logOperation({
      sessionId,
      commercialUsername,
      operationType,
      status: SyncOperationStatus.FAILED,
      level: SyncLogLevel.ERROR,
      message,
      errorMessage,
      duration,
      context: context ? JSON.stringify(context) : undefined
    });
  }

  /**
   * Enregistre un avertissement
   */
  async logWarning(
    sessionId: string,
    commercialUsername: string,
    operationType: string,
    message: string,
    context?: any
  ): Promise<string> {
    return this.logOperation({
      sessionId,
      commercialUsername,
      operationType,
      status: SyncOperationStatus.IN_PROGRESS,
      level: SyncLogLevel.WARNING,
      message,
      context: context ? JSON.stringify(context) : undefined
    });
  }

  /**
   * Récupère les logs selon les critères spécifiés
   * 
   * @param options Options de requête
   * @returns Promise d'un tableau d'entrées de log
   */
  async queryLogs(options: SyncLogQueryOptions = {}): Promise<SyncLogEntry[]> {
    try {
      let sql = 'SELECT * FROM sync_operation_logs WHERE 1=1';
      const params: any[] = [];

      // Filtres
      if (options.sessionId) {
        sql += ' AND sessionId = ?';
        params.push(options.sessionId);
      }

      if (options.commercialUsername) {
        sql += ' AND commercialUsername = ?';
        params.push(options.commercialUsername);
      }

      if (options.operationType) {
        sql += ' AND operationType = ?';
        params.push(options.operationType);
      }

      if (options.status) {
        sql += ' AND status = ?';
        params.push(options.status);
      }

      if (options.level) {
        sql += ' AND level = ?';
        params.push(options.level);
      }

      if (options.startDate) {
        sql += ' AND timestamp >= ?';
        params.push(options.startDate.toISOString());
      }

      if (options.endDate) {
        sql += ' AND timestamp <= ?';
        params.push(options.endDate.toISOString());
      }

      // Tri par timestamp décroissant (plus récent en premier)
      sql += ' ORDER BY timestamp DESC';

      // Limite
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
      }

      const result = await this.dbService.query(sql, params);
      
      if (!result || !result.values) {
        return [];
      }

      return result.values.map((row: any) => this.mapRowToLogEntry(row));
    } catch (error: any) {
      this.log.error(`SyncLogger: Failed to query logs: ${error.message}`, error);
      return [];
    }
  }

  /**
   * Récupère les logs d'une session spécifique
   */
  async getSessionLogs(sessionId: string): Promise<SyncLogEntry[]> {
    return this.queryLogs({ sessionId });
  }

  /**
   * Récupère les logs récents (dernières 24 heures)
   */
  async getRecentLogs(limit: number = 100): Promise<SyncLogEntry[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return this.queryLogs({
      startDate: yesterday,
      limit
    });
  }

  /**
   * Récupère les logs d'erreur
   */
  async getErrorLogs(limit: number = 50): Promise<SyncLogEntry[]> {
    return this.queryLogs({
      level: SyncLogLevel.ERROR,
      limit
    });
  }

  /**
   * Compte le nombre total de logs
   */
  async getLogCount(): Promise<number> {
    try {
      const result = await this.dbService.query(
        'SELECT COUNT(*) as count FROM sync_operation_logs'
      );
      return result?.values?.[0]?.count || 0;
    } catch (error: any) {
      this.log.error(`SyncLogger: Failed to get log count: ${error.message}`, error);
      return 0;
    }
  }

  /**
   * Effectue la rotation automatique des logs
   * Supprime les logs au-delà de la limite de rétention
   * 
   * Stratégie:
   * - Conserver les 30 derniers jours
   * - Conserver maximum 1000 entrées
   * - Prioriser les logs d'erreur
   */
  async rotateLogsIfNeeded(): Promise<void> {
    try {
      const count = await this.getLogCount();

      // Vérifier si rotation nécessaire
      if (count <= this.MAX_LOG_ENTRIES) {
        return;
      }

      // Supprimer les logs au-delà de la période de rétention
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.LOG_RETENTION_DAYS);

      const deleteOldSql = `
        DELETE FROM sync_operation_logs 
        WHERE timestamp < ? AND level != ?
      `;
      await this.dbService.execute(deleteOldSql, [
        retentionDate.toISOString(),
        SyncLogLevel.ERROR
      ]);

      // Si toujours trop de logs, supprimer les plus anciens (sauf erreurs)
      const newCount = await this.getLogCount();
      if (newCount > this.MAX_LOG_ENTRIES) {
        const excessCount = newCount - this.MAX_LOG_ENTRIES;
        const deleteExcessSql = `
          DELETE FROM sync_operation_logs 
          WHERE id IN (
            SELECT id FROM sync_operation_logs 
            WHERE level != ?
            ORDER BY timestamp ASC 
            LIMIT ?
          )
        `;
        await this.dbService.execute(deleteExcessSql, [
          SyncLogLevel.ERROR,
          excessCount
        ]);
      }

      this.log.log(`SyncLogger: Log rotation completed. Deleted ${count - await this.getLogCount()} entries`);
    } catch (error: any) {
      this.log.error(`SyncLogger: Failed to rotate logs: ${error.message}`, error);
    }
  }

  /**
   * Supprime tous les logs d'une session
   */
  async deleteSessionLogs(sessionId: string): Promise<void> {
    try {
      const sql = 'DELETE FROM sync_operation_logs WHERE sessionId = ?';
      await this.dbService.execute(sql, [sessionId]);
      this.log.log(`SyncLogger: Deleted logs for session ${sessionId}`);
    } catch (error: any) {
      this.log.error(`SyncLogger: Failed to delete session logs: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Supprime tous les logs
   */
  async clearAllLogs(): Promise<void> {
    try {
      const sql = 'DELETE FROM sync_operation_logs';
      await this.dbService.execute(sql);
      this.log.log('SyncLogger: All logs cleared');
    } catch (error: any) {
      this.log.error(`SyncLogger: Failed to clear logs: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Mappe une ligne de base de données vers une entrée de log
   */
  private mapRowToLogEntry(row: any): SyncLogEntry {
    return {
      id: row.id,
      sessionId: row.sessionId,
      commercialUsername: row.commercialUsername,
      operationType: row.operationType,
      status: row.status as SyncOperationStatus,
      level: row.level as SyncLogLevel,
      message: row.message,
      context: row.context,
      timestamp: new Date(row.timestamp),
      duration: row.duration,
      itemsProcessed: row.itemsProcessed,
      errorMessage: row.errorMessage
    };
  }

  /**
   * Enregistre également dans le système de logs général
   */
  private logToGeneralLogger(entry: SyncLogEntry): void {
    const logMessage = `[${entry.level}] [${entry.operationType}] ${entry.message}`;
    
    if (entry.level === SyncLogLevel.ERROR) {
      this.log.error(logMessage, entry.errorMessage);
    } else {
      this.log.log(logMessage);
    }
  }

  /**
   * Génère un UUID v4
   */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
