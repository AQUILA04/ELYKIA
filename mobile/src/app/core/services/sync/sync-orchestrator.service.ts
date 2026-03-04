import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, from, of } from 'rxjs';
import { switchMap, map, catchError, tap, finalize } from 'rxjs/operators';
import {
  ISyncOrchestrator,
  SyncOptions,
  SyncResult,
  SyncStatus,
  SyncSession,
  SyncProgress,
  PageProgress,
  SyncError,
  SyncErrorType,
  SyncContext,
  ExpectedData,
  ActualData,
  RestorePoint
} from '../../models/tontine-sync.models';
import { DataCleanerService } from './data-cleaner.service';
import { SequentialSyncManager } from './sequential-sync-manager.service';
import { IntegrityValidatorService } from './integrity-validator.service';
import { ErrorHandlerService } from './error-handler.service';
import { RollbackManagerService } from './rollback-manager.service';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';

/**
 * Orchestrateur principal de synchronisation
 * 
 * Responsabilité: Coordonner l'ensemble du processus de synchronisation
 * - Gère le cycle complet: nettoyage → sync → validation
 * - Coordonne tous les services de synchronisation
 * - Gère les erreurs et rollbacks
 * - Fournit le statut en temps réel
 * 
 * Valide les exigences:
 * - 1.1: Récupération de la totalité des données disponibles
 * - 1.2: Sauvegarde exacte du nombre de données attendu
 * - 1.3: Vérification du nombre de données sauvegardées
 */
@Injectable({
  providedIn: 'root'
})
export class SyncOrchestratorService implements ISyncOrchestrator {
  private currentSession: SyncSession | null = null;
  private statusSubject = new BehaviorSubject<SyncStatus>(SyncStatus.PENDING);
  private isCancelled = false;
  private restorePoint: RestorePoint | null = null;

  constructor(
    private dataCleaner: DataCleanerService,
    private syncManager: SequentialSyncManager,
    private integrityValidator: IntegrityValidatorService,
    private errorHandler: ErrorHandlerService,
    private rollbackManager: RollbackManagerService,
    private dbService: DatabaseService,
    private log: LoggerService
  ) {}

  /**
   * Démarre une synchronisation complète
   * Exigences: 1.1, 1.2, 1.3
   * 
   * Processus:
   * 1. Validation préalable
   * 2. Création d'un point de restauration
   * 3. Nettoyage des données
   * 4. Synchronisation séquentielle (membres → collections → stocks)
   * 5. Validation d'intégrité
   * 6. Gestion d'erreur et rollback si nécessaire
   */
  startSync(options: SyncOptions): Observable<SyncResult> {
    this.log.log('SyncOrchestrator: Starting sync process');
    
    // Vérifier qu'aucune synchronisation n'est en cours
    if (this.currentSession && this.currentSession.status === SyncStatus.IN_PROGRESS) {
      const error = this.createSyncError(
        SyncErrorType.VALIDATION,
        'Une synchronisation est déjà en cours',
        this.createErrorContext('', options.commercialUsername, 'startSync')
      );
      return throwError(() => error);
    }

    // Réinitialiser le flag d'annulation
    this.isCancelled = false;

    // Créer une nouvelle session
    const startTime = new Date();
    this.currentSession = this.createSyncSession(options, startTime);
    this.statusSubject.next(SyncStatus.IN_PROGRESS);

    const result: SyncResult = {
      success: false,
      totalMembers: 0,
      totalCollections: 0,
      totalStocks: 0,
      errors: [],
      duration: 0
    };

    // Étape 1: Créer un point de restauration
    return from(this.createRestorePoint(options)).pipe(
      // Étape 2: Nettoyage des données
      switchMap(() => this.performCleanup(options, result)),
      
      // Étape 3: Obtenir le sessionId
      switchMap(() => from(this.getSessionId())),
      
      // Étape 4: Synchronisation séquentielle
      switchMap(sessionId => this.performSequentialSync(sessionId, options, result)),
      
      // Étape 5: Validation d'intégrité
      switchMap(() => this.performIntegrityValidation(options, result)),
      
      // Finalisation
      map(() => {
        const endTime = new Date();
        result.duration = endTime.getTime() - startTime.getTime();
        result.success = result.errors.length === 0;
        
        this.updateSessionStatus(SyncStatus.COMPLETED, result);
        this.log.log(`SyncOrchestrator: Sync completed successfully in ${result.duration}ms`);
        
        return result;
      }),
      
      // Gestion d'erreur
      catchError(error => this.handleSyncFailure(error, options, result, startTime)),
      
      // Nettoyage final
      finalize(() => {
        this.statusSubject.next(
          result.success ? SyncStatus.COMPLETED : SyncStatus.FAILED
        );
        this.restorePoint = null;
      })
    );
  }

  /**
   * Annule la synchronisation en cours
   */
  cancelSync(): void {
    this.log.log('SyncOrchestrator: Cancelling sync');
    this.isCancelled = true;
    
    if (this.currentSession) {
      this.currentSession.status = SyncStatus.CANCELLED;
      this.statusSubject.next(SyncStatus.CANCELLED);
    }
  }

  /**
   * Obtient le statut actuel de la synchronisation
   */
  getSyncStatus(): Observable<SyncStatus> {
    return this.statusSubject.asObservable();
  }

  /**
   * Crée un point de restauration avant la synchronisation
   */
  private createRestorePoint(options: SyncOptions): Promise<void> {
    this.log.log('SyncOrchestrator: Creating restore point');
    this.updateProgress('Création du point de restauration', 0, 5);
    
    return this.rollbackManager.createRestorePoint()
      .then(restorePoint => {
        this.restorePoint = restorePoint;
        this.log.log('SyncOrchestrator: Restore point created');
      })
      .catch(error => {
        this.log.log(`SyncOrchestrator: Failed to create restore point: ${error.message}`);
        // Ne pas bloquer la synchronisation si le restore point échoue
        // mais logger l'erreur
      });
  }

  /**
   * Effectue le nettoyage des données
   */
  private performCleanup(options: SyncOptions, result: SyncResult): Observable<void> {
    if (!options.forceCleanup) {
      this.log.log('SyncOrchestrator: Skipping cleanup (forceCleanup=false)');
      return of(undefined);
    }

    this.log.log('SyncOrchestrator: Starting data cleanup');
    this.updateProgress('Nettoyage des données', 1, 5);

    return from(this.dataCleaner.cleanTontineData(options.commercialUsername)).pipe(
      tap(cleanupResult => {
        this.log.log(
          `SyncOrchestrator: Cleanup completed - ${cleanupResult.membersDeleted} members, ` +
          `${cleanupResult.collectionsDeleted} collections, ${cleanupResult.stocksDeleted} stocks deleted`
        );
      }),
      map(() => undefined),
      catchError(error => {
        const syncError = this.createSyncError(
          SyncErrorType.DATABASE,
          `Erreur lors du nettoyage des données: ${error.message}`,
          this.createErrorContext('', options.commercialUsername, 'cleanup')
        );
        result.errors.push(syncError);
        return throwError(() => syncError);
      })
    );
  }

  /**
   * Obtient le sessionId de la tontine
   */
  private async getSessionId(): Promise<string> {
    const session = await this.dbService.getTontineSession();
    if (!session || !session.id) {
      throw new Error('Aucune session tontine trouvée');
    }
    return session.id;
  }

  /**
   * Effectue la synchronisation séquentielle de toutes les données
   */
  private performSequentialSync(
    sessionId: string,
    options: SyncOptions,
    result: SyncResult
  ): Observable<void> {
    this.log.log('SyncOrchestrator: Starting sequential sync');

    // Synchronisation des membres
    return this.syncManager.syncMembers(sessionId, options).pipe(
      tap(membersResult => {
        this.checkCancellation();
        result.totalMembers = membersResult.savedItems;
        result.errors.push(...membersResult.errors);
        this.updateProgress('Synchronisation des membres', 2, 5);
        this.log.log(`SyncOrchestrator: Members synced - ${membersResult.savedItems} items`);
      }),
      
      // Synchronisation des collections
      switchMap(() => {
        this.checkCancellation();
        return this.syncManager.syncCollections(options);
      }),
      tap(collectionsResult => {
        this.checkCancellation();
        result.totalCollections = collectionsResult.savedItems;
        result.errors.push(...collectionsResult.errors);
        this.updateProgress('Synchronisation des collections', 3, 5);
        this.log.log(`SyncOrchestrator: Collections synced - ${collectionsResult.savedItems} items`);
      }),
      
      // Synchronisation des stocks
      switchMap(() => {
        this.checkCancellation();
        return this.syncManager.syncStocks(sessionId, options);
      }),
      tap(stocksResult => {
        this.checkCancellation();
        result.totalStocks = stocksResult.savedItems;
        result.errors.push(...stocksResult.errors);
        this.updateProgress('Synchronisation des stocks', 4, 5);
        this.log.log(`SyncOrchestrator: Stocks synced - ${stocksResult.savedItems} items`);
      }),
      
      map(() => undefined)
    );
  }

  /**
   * Effectue la validation d'intégrité des données synchronisées
   * Exigence 1.3: Vérifier que le nombre de données sauvegardées correspond au nombre total attendu
   */
  private performIntegrityValidation(
    options: SyncOptions,
    result: SyncResult
  ): Observable<void> {
    this.log.log('SyncOrchestrator: Starting integrity validation');
    this.updateProgress('Validation d\'intégrité', 5, 5);

    return from(this.getActualDataCounts(options.commercialUsername)).pipe(
      map(actualData => {
        // Les données attendues sont celles que nous avons synchronisées
        const expectedData: ExpectedData = {
          memberCount: result.totalMembers,
          collectionCount: result.totalCollections,
          stockCount: result.totalStocks
        };

        const validationResult = this.integrityValidator.validateSyncResult(
          expectedData,
          actualData
        );

        if (!validationResult.isValid) {
          const error = this.createSyncError(
            SyncErrorType.VALIDATION,
            `Échec de validation d'intégrité: ${validationResult.missingItems.join(', ')}`,
            this.createErrorContext('', options.commercialUsername, 'validation')
          );
          result.errors.push(error);
          throw error;
        }

        this.log.log('SyncOrchestrator: Integrity validation passed');
      })
    );
  }

  /**
   * Obtient les counts réels des données dans la base locale
   */
  private async getActualDataCounts(commercialUsername: string): Promise<ActualData> {
    const session = await this.dbService.getTontineSession();
    const sessionId = session?.id;

    if (!sessionId) {
      throw new Error('Aucune session tontine trouvée pour la validation');
    }

    // Compter les membres
    const membersQuery = `
      SELECT COUNT(*) as count 
      FROM tontine_members 
      WHERE tontineSessionId = ? AND commercialUsername = ?
    `;
    const membersResult = await this.dbService.query(membersQuery, [sessionId, commercialUsername]);
    const memberCount = membersResult?.values?.[0]?.count || 0;

    // Compter les collections
    const collectionsQuery = `
      SELECT COUNT(*) as count 
      FROM tontine_collections 
      WHERE commercialUsername = ?
    `;
    const collectionsResult = await this.dbService.query(collectionsQuery, [commercialUsername]);
    const collectionCount = collectionsResult?.values?.[0]?.count || 0;

    // Compter les stocks
    const stocksQuery = `
      SELECT COUNT(*) as count 
      FROM tontine_stocks 
      WHERE commercial = ?
    `;
    const stocksResult = await this.dbService.query(stocksQuery, [commercialUsername]);
    const stockCount = stocksResult?.values?.[0]?.count || 0;

    return {
      memberCount,
      collectionCount,
      stockCount
    };
  }

  /**
   * Gère l'échec de synchronisation avec rollback si nécessaire
   */
  private handleSyncFailure(
    error: any,
    options: SyncOptions,
    result: SyncResult,
    startTime: Date
  ): Observable<SyncResult> {
    this.log.log(`SyncOrchestrator: Sync failed: ${error.message}`);

    // Créer une erreur de synchronisation si ce n'est pas déjà le cas
    const syncError: SyncError = error.type ? error : this.createSyncError(
      SyncErrorType.VALIDATION,
      error.message || 'Erreur inconnue',
      this.createErrorContext('', options.commercialUsername, 'sync')
    );

    result.errors.push(syncError);

    // Gérer l'erreur via le ErrorHandler
    const handlingResult = this.errorHandler.handleSyncError(
      syncError,
      syncError.context
    );

    // Effectuer un rollback si nécessaire
    if (handlingResult.shouldRollback && this.restorePoint) {
      this.log.log('SyncOrchestrator: Performing rollback');
      
      return from(this.rollbackManager.rollbackToRestorePoint(this.restorePoint)).pipe(
        map(() => {
          this.log.log('SyncOrchestrator: Rollback completed');
          result.duration = new Date().getTime() - startTime.getTime();
          result.success = false;
          this.updateSessionStatus(SyncStatus.FAILED, result);
          return result;
        }),
        catchError(rollbackError => {
          this.log.log(`SyncOrchestrator: Rollback failed: ${rollbackError.message}`);
          result.duration = new Date().getTime() - startTime.getTime();
          result.success = false;
          this.updateSessionStatus(SyncStatus.FAILED, result);
          return of(result);
        })
      );
    }

    // Pas de rollback nécessaire
    result.duration = new Date().getTime() - startTime.getTime();
    result.success = false;
    this.updateSessionStatus(SyncStatus.FAILED, result);
    return of(result);
  }

  /**
   * Vérifie si la synchronisation a été annulée
   */
  private checkCancellation(): void {
    if (this.isCancelled) {
      throw new Error('Synchronisation annulée par l\'utilisateur');
    }
  }

  /**
   * Crée une session de synchronisation
   */
  private createSyncSession(options: SyncOptions, startTime: Date): SyncSession {
    return {
      id: this.generateUuid(),
      commercialUsername: options.commercialUsername,
      sessionId: options.sessionId || '',
      startTime,
      status: SyncStatus.IN_PROGRESS,
      progress: {
        currentStep: 'Initialisation',
        totalSteps: 5,
        completedSteps: 0,
        currentPageProgress: {
          currentPage: 0,
          totalPages: 0,
          itemsProcessed: 0,
          totalItems: 0
        }
      }
    };
  }

  /**
   * Met à jour la progression de la synchronisation
   */
  private updateProgress(step: string, completedSteps: number, totalSteps: number): void {
    if (this.currentSession) {
      this.currentSession.progress.currentStep = step;
      this.currentSession.progress.completedSteps = completedSteps;
      this.currentSession.progress.totalSteps = totalSteps;
    }
  }

  /**
   * Met à jour le statut de la session
   */
  private updateSessionStatus(status: SyncStatus, result?: SyncResult): void {
    if (this.currentSession) {
      this.currentSession.status = status;
      this.currentSession.endTime = new Date();
      if (result) {
        this.currentSession.result = result;
      }
    }
  }

  /**
   * Crée un contexte d'erreur
   */
  private createErrorContext(
    sessionId: string,
    commercialUsername: string,
    currentStep: string
  ): SyncContext {
    return {
      sessionId,
      commercialUsername,
      currentStep,
      timestamp: new Date()
    };
  }

  /**
   * Crée une erreur de synchronisation
   */
  private createSyncError(
    type: SyncErrorType,
    message: string,
    context: SyncContext
  ): SyncError {
    return {
      type,
      message,
      context,
      timestamp: new Date(),
      retryable: type === SyncErrorType.NETWORK
    };
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
