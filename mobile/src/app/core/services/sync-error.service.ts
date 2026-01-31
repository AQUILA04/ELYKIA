import { Injectable, Injector } from '@angular/core';
import { DatabaseService } from './database.service';
import { SynchronizationService } from './synchronization.service';
import { SyncError, SyncLogEntry } from '../../models/sync.model';

@Injectable({
  providedIn: 'root'
})
export class SyncErrorService {

  constructor(
    private databaseService: DatabaseService,
    private injector: Injector
  ) {}

  /**
   * Enregistrer une erreur de synchronisation
   */
  async logSyncError(
    entityType: string,
    entityId: string,
    operation: string,
    error: any,
    requestData: any,
    entityDisplayName: string,
    entityDetails: any
  ): Promise<void> {
    const errorId = this.generateId();
    const errorMessage = this.extractErrorMessage(error);
    const errorCode = this.extractErrorCode(error);
    const today = new Date();

    try {
      await this.databaseService.execute(`
        INSERT INTO sync_logs
        (id, entityType, entityId, operation, status, errorMessage, errorCode,
         requestData, responseData, syncDate, retryCount, entityDisplayName, entityDetails)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        errorId,
        entityType,
        entityId,
        operation,
        'ERROR',
        errorMessage,
        errorCode,
        JSON.stringify(requestData),
        JSON.stringify(error.response || error),
        today.toISOString(),
        0,
        entityDisplayName,
        JSON.stringify(entityDetails)
      ]);
    } catch (dbError) {
      console.error('Erreur lors de l\'enregistrement de l\'erreur de sync:', dbError);
    }
  }

  /**
   * Récupérer toutes les erreurs de synchronisation
   */
  async getSyncErrors(): Promise<SyncError[]> {
    try {
      const result = await this.databaseService.query(`
        SELECT * FROM sync_logs
        WHERE status = 'ERROR'
        ORDER BY syncDate DESC
      `);

      // LOG AJOUTÉ POUR LE DÉBOGAGE
      console.log('Raw DB result from getSyncErrors:', result.values);

      return result.values?.map((row: any) => this.mapRowToSyncError(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des erreurs de sync:', error);
      return [];
    }
  }

  /**
   * Récupérer les erreurs par type d'entité
   */
  async getSyncErrorsByType(entityType: string): Promise<SyncError[]> {
    try {
      const result = await this.databaseService.query(`
        SELECT * FROM sync_logs
        WHERE status = 'ERROR' AND entityType = ?
        ORDER BY syncDate DESC
      `, [entityType]);

      return result.values?.map((row: any) => this.mapRowToSyncError(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des erreurs par type:', error);
      return [];
    }
  }

  /**
   * Récupérer une erreur spécifique par ID
   */
  async getSyncErrorById(errorId: string): Promise<SyncError | null> {
    try {
      const result = await this.databaseService.query(`
        SELECT * FROM sync_logs WHERE id = ?
      `, [errorId]);

      if (result.values && result.values.length > 0) {
        return this.mapRowToSyncError(result.values[0]);
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'erreur par ID:', error);
      return null;
    }
  }

  /**
   * Réessayer la synchronisation d'un élément en erreur
   */
  async retrySyncError(errorId: string): Promise<boolean> {
    const error = await this.getSyncErrorById(errorId);
    if (!error || !error.canRetry) {
      return false;
    }

    try {
      // Marquer comme en cours de retry
      await this.updateSyncErrorStatus(errorId, 'RETRYING');

      // Effectuer la synchronisation selon le type d'entité
      const success = await this.performRetrySync(error);

      if (success) {
        await this.markSyncErrorAsResolved(errorId);
        return true;
      } else {
        await this.incrementRetryCount(errorId);
        return false;
      }
    } catch (retryError) {
      await this.updateSyncError(errorId, retryError);
      return false;
    }
  }

  /**
   * Réessayer plusieurs erreurs sélectionnées
   */
  async retrySelectedErrors(errorIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const errorId of errorIds) {
      const result = await this.retrySyncError(errorId);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Supprimer les erreurs résolues
   */
  async clearResolvedErrors(): Promise<void> {
    try {
      await this.databaseService.execute(`
        DELETE FROM sync_logs
        WHERE status = 'SUCCESS' OR resolvedDate IS NOT NULL
      `);
    } catch (error) {
      console.error('Erreur lors de la suppression des erreurs résolues:', error);
    }
  }

  /**
   * Obtenir le nombre d'erreurs en attente
   */
  async getPendingErrorsCount(): Promise<number> {
    try {
      const result = await this.databaseService.query(`
        SELECT COUNT(*) as count FROM sync_logs WHERE status = 'ERROR'
      `);

      return result.values?.[0]?.[0] || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des erreurs:', error);
      return 0;
    }
  }

  /**
   * Obtenir les statistiques des erreurs
   */
  async getErrorStatistics(): Promise<{ [key: string]: number }> {
    try {
      const result = await this.databaseService.query(`
        SELECT entityType, COUNT(*) as count
        FROM sync_logs
        WHERE status = 'ERROR'
        GROUP BY entityType
      `);

      const stats: { [key: string]: number } = {};
      result.values?.forEach((row: any) => {
        stats[row[0]] = row[1];
      });

      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return {};
    }
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * Effectuer la synchronisation selon le type d'entité
   */
  private async performRetrySync(error: SyncError): Promise<boolean> {
    try {
      switch (error.entityType) {
        case 'client':
          return await this.retryClientSync(error);
        case 'distribution':
          return await this.retryDistributionSync(error);
        case 'recovery':
          return await this.retryRecoverySync(error);
        case 'account':
          return await this.retryAccountSync(error);
        default:
          return false;
      }
    } catch (error) {
      console.error('Erreur lors du retry de synchronisation:', error);
      return false;
    }
  }

  /**
   * Réessayer la synchronisation d'un client
   */
  private async retryClientSync(error: SyncError): Promise<boolean> {
    try {
      // Récupérer le client depuis la base de données
      const client = await this.getClientById(error.entityId);
      if (!client) return false;

      // Utiliser le service de synchronisation
      await this.injector.get(SynchronizationService).syncSingleClient(client);
      return true;
    } catch (err) {
      console.error('Erreur lors du retry client:', err);
      return false;
    }
  }

  /**
   * Réessayer la synchronisation d'une distribution
   */
  private async retryDistributionSync(error: SyncError): Promise<boolean> {
    try {
      const distribution = await this.getDistributionById(error.entityId);
      if (!distribution) return false;

      await this.injector.get(SynchronizationService).syncSingleDistribution(distribution);
      return true;
    } catch (err) {
      console.error('Erreur lors du retry distribution:', err);
      return false;
    }
  }

  /**
   * Réessayer la synchronisation d'un recouvrement
   */
  private async retryRecoverySync(error: SyncError): Promise<boolean> {
    try {
      // Les recouvrements sont synchronisés par batch
      // Il faudrait implémenter une logique spécifique
      return false;
    } catch (err) {
      console.error('Erreur lors du retry recouvrement:', err);
      return false;
    }
  }

  /**
   * Réessayer la synchronisation d'un compte
   */
  private async retryAccountSync(error: SyncError): Promise<boolean> {
    try {
      // Logique spécifique pour les comptes
      return false;
    } catch (err) {
      console.error('Erreur lors du retry compte:', err);
      return false;
    }
  }

  /**
   * Mettre à jour le statut d'une erreur
   */
  private async updateSyncErrorStatus(errorId: string, status: string): Promise<void> {
    try {
      await this.databaseService.execute(`
        UPDATE sync_logs
        SET status = ?, lastRetryDate = datetime('now')
        WHERE id = ?
      `, [status, errorId]);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  }

  /**
   * Marquer une erreur comme résolue
   */
  private async markSyncErrorAsResolved(errorId: string): Promise<void> {
    try {
      await this.databaseService.execute(`
        UPDATE sync_logs
        SET status = 'SUCCESS', resolvedDate = datetime('now')
        WHERE id = ?
      `, [errorId]);
    } catch (error) {
      console.error('Erreur lors du marquage comme résolu:', error);
    }
  }

  /**
   * Incrémenter le compteur de tentatives
   */
  private async incrementRetryCount(errorId: string): Promise<void> {
    try {
      await this.databaseService.execute(`
        UPDATE sync_logs
        SET retryCount = retryCount + 1, lastRetryDate = datetime('now'), status = 'ERROR'
        WHERE id = ?
      `, [errorId]);
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation du retry count:', error);
    }
  }

  /**
   * Mettre à jour une erreur avec de nouvelles informations
   */
  private async updateSyncError(errorId: string, error: any): Promise<void> {
    const errorMessage = this.extractErrorMessage(error);
    const errorCode = this.extractErrorCode(error);

    try {
      await this.databaseService.execute(`
        UPDATE sync_logs
        SET errorMessage = ?, errorCode = ?, responseData = ?,
            retryCount = retryCount + 1, lastRetryDate = datetime('now'), status = 'ERROR'
        WHERE id = ?
      `, [errorMessage, errorCode, JSON.stringify(error.response || error), errorId]);
    } catch (dbError) {
      console.error('Erreur lors de la mise à jour de l\'erreur:', dbError);
    }
  }

  /**
   * Mapper une ligne de base de données vers un objet SyncError
   */
  private mapRowToSyncError(row: any): SyncError {
    // Si row est un objet (ce qui est le cas avec CapacitorSQLite quand on utilise query),
    // on accède aux propriétés par leur nom.
    // Si c'est un tableau (ce qui peut arriver avec certaines configurations), on utilise les index.

    // Détection du type de row
    if (row && typeof row === 'object' && !Array.isArray(row)) {
        // Cas objet (nom des colonnes)
        return {
            id: row.id,
            entityType: row.entityType,
            entityId: row.entityId,
            operation: row.operation,
            errorMessage: row.errorMessage || 'Erreur inconnue',
            errorCode: row.errorCode,
            syncDate: new Date(row.syncDate),
            retryCount: row.retryCount || 0,
            entityDisplayName: row.entityDisplayName || 'Élément inconnu',
            entityDetails: row.entityDetails ? JSON.parse(row.entityDetails) : {},
            canRetry: (row.retryCount || 0) < 3,
            requestData: row.requestData ? JSON.parse(row.requestData) : null,
            responseData: row.responseData ? JSON.parse(row.responseData) : null
        };
    }

    // Cas tableau (index) - Fallback si jamais le plugin retourne des tableaux
    // Ordre des colonnes dans CREATE TABLE sync_logs :
    // 0: id, 1: entityType, 2: entityId, 3: operation, 4: status, 5: errorMessage, 6: errorCode,
    // 7: requestData, 8: responseData, 9: syncDate, 10: retryCount, 11: entityDisplayName, 12: entityDetails
    // ATTENTION: L'ordre dépend de la requête SELECT *
    // Dans CREATE TABLE:
    // id, entityType, entityId, operation, status, errorCode, requestData, responseData, entityDisplayName, entityDetails, errorMessage, syncDate, retryCount

    // Si on utilise SELECT *, l'ordre est celui de la création.
    // 0: id
    // 1: entityType
    // 2: entityId
    // 3: operation
    // 4: status
    // 5: errorCode
    // 6: requestData
    // 7: responseData
    // 8: entityDisplayName
    // 9: entityDetails
    // 10: errorMessage
    // 11: syncDate
    // 12: retryCount

    const r = row as any[];
    return {
      id: r[0],
      entityType: r[1],
      entityId: r[2],
      operation: r[3],
      errorCode: r[5],
      requestData: r[6] ? JSON.parse(r[6]) : null,
      responseData: r[7] ? JSON.parse(r[7]) : null,
      entityDisplayName: r[8] || 'Élément inconnu',
      entityDetails: r[9] ? JSON.parse(r[9]) : {},
      errorMessage: r[10] || 'Erreur inconnue',
      syncDate: new Date(r[11]),
      retryCount: r[12] || 0,
      canRetry: (r[12] || 0) < 3
    };
  }

  /**
   * Extraire le message d'erreur
   */
  private extractErrorMessage(error: any): string {
    // Cas où l'erreur est dans error.error (réponse API structurée)
    if (error?.error) {
      // Si error.error est un objet avec un message
      if (typeof error.error === 'object') {
        if (error.error.message) {
            return error.error.message;
        }
        // Parfois l'erreur est imbriquée dans error.error.error
        if (error.error.error && typeof error.error.error === 'object' && error.error.error.message) {
             return error.error.error.message;
        }
      }

      // Si error.error est une chaîne (peut-être du JSON stringifié)
      if (typeof error.error === 'string') {
        try {
          const parsed = JSON.parse(error.error);
          if (parsed && parsed.message) {
            return parsed.message;
          }
        } catch (e) {
          // Ce n'est pas du JSON, on retourne la chaîne telle quelle
          return error.error;
        }
      }
    }

    // Cas standard HttpErrorResponse ou Error
    if (error?.message) {
      return error.message;
    }

    // Cas où l'erreur est une simple chaîne
    if (typeof error === 'string') {
      return error;
    }

    return 'Erreur inconnue lors de la synchronisation';
  }

  /**
   * Extraire le code d'erreur
   */
  private extractErrorCode(error: any): string | undefined {
    if (error?.error?.statusCode) return error.error.statusCode.toString();
    if (error?.error?.status) return error.error.status.toString();
    if (error?.status) return error.status.toString();
    if (error?.code) return error.code.toString();
    return undefined;
  }

  /**
   * Générer un ID unique
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ==================== MÉTHODES À IMPLÉMENTER ====================
  // Ces méthodes seront implémentées quand les services correspondants seront prêts

  private async getClientById(clientId: string): Promise<any> {
    // TODO: Implémenter avec le service client
    return null;
  }

  private async getDistributionById(distributionId: string): Promise<any> {
    // TODO: Implémenter avec le service distribution
    return null;
  }
}
