import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, from, timer, EMPTY } from 'rxjs';
import { 
  map, 
  catchError, 
  switchMap, 
  tap, 
  withLatestFrom,
  takeUntil,
  concatMap,
  delay
} from 'rxjs/operators';

import { SynchronizationService } from '../../core/services/synchronization.service';
import { SyncErrorService } from '../../core/services/sync-error.service';
import { ClientService } from '../../core/services/client.service';
import { DistributionService } from '../../core/services/distribution.service';
import { RecoveryService } from '../../core/services/recovery.service';

import * as SyncActions from './sync.actions';
import { selectAutomaticSyncIsActive } from './sync.selectors';
import { SyncProgress, SyncPhase } from '../../models/sync.model';

@Injectable()
export class SyncEffects {

  constructor(
    private actions$: Actions,
    private store: Store,
    private syncService: SynchronizationService,
    private syncErrorService: SyncErrorService,
    private clientService: ClientService,
    private distributionService: DistributionService,
    private recoveryService: RecoveryService
  ) {}

  // ==================== EFFETS SYNCHRONISATION AUTOMATIQUE ====================

  /**
   * Démarrer la synchronisation automatique
   */
  startAutomaticSync$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.startAutomaticSync),
      switchMap(() => {
        // Créer un observable qui émet des mises à jour de progression
        return from(this.performAutomaticSync()).pipe(
          takeUntil(this.actions$.pipe(ofType(SyncActions.cancelAutomaticSync))),
          catchError(error => {
            console.error('Erreur lors de la synchronisation automatique:', error);
            return of(SyncActions.automaticSyncFailure({ error }));
          })
        );
      })
    )
  );

  /**
   * Annuler la synchronisation automatique
   */
  cancelAutomaticSync$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.cancelAutomaticSync),
      tap(() => {
        console.log('Synchronisation automatique annulée');
        // Ici on pourrait ajouter une logique pour nettoyer les opérations en cours
      })
    ),
    { dispatch: false }
  );

  // ==================== EFFETS SYNCHRONISATION MANUELLE ====================

  /**
   * Charger les données pour la synchronisation manuelle
   */
  loadManualSyncData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.loadManualSyncData),
      switchMap(() =>
        from(this.loadUnsyncedData()).pipe(
          map(({ clients, distributions, recoveries }) =>
            SyncActions.loadManualSyncDataSuccess({ clients, distributions, recoveries })
          ),
          catchError(error =>
            of(SyncActions.loadManualSyncDataFailure({ error }))
          )
        )
      )
    )
  );

  /**
   * Synchronisation manuelle par type d'entité
   */
  startManualSync$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.startManualSync),
      switchMap(({ entityType, selectedIds }) =>
        from(this.performManualSync(entityType, selectedIds)).pipe(
          map(({ successCount, errorCount }) =>
            SyncActions.manualSyncSuccess({ entityType, successCount, errorCount })
          ),
          catchError(error =>
            of(SyncActions.manualSyncFailure({ entityType, error }))
          )
        )
      )
    )
  );

  /**
   * Synchronisation d'une entité individuelle
   */
  syncSingleEntity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.syncSingleEntity),
      concatMap(({ entityType, entityId }) =>
        from(this.syncSingleEntityById(entityType, entityId)).pipe(
          map(() =>
            SyncActions.syncSingleEntitySuccess({ entityType, entityId })
          ),
          catchError(error =>
            of(SyncActions.syncSingleEntityFailure({ entityType, entityId, error }))
          )
        )
      )
    )
  );

  // ==================== EFFETS GESTION DES ERREURS ====================

  /**
   * Charger les erreurs de synchronisation
   */
  loadSyncErrors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.loadSyncErrors),
      switchMap(() =>
        from(this.syncErrorService.getSyncErrors()).pipe(
          map(errors => SyncActions.loadSyncErrorsSuccess({ errors })),
          catchError(error => of(SyncActions.loadSyncErrorsFailure({ error })))
        )
      )
    )
  );

  /**
   * Réessayer une erreur de synchronisation
   */
  retrySyncError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.retrySyncError),
      switchMap(({ errorId }) =>
        from(this.syncErrorService.retrySyncError(errorId)).pipe(
          map(success => 
            success 
              ? SyncActions.retrySyncErrorSuccess({ errorId })
              : SyncActions.retrySyncErrorFailure({ errorId, error: 'Échec du retry' })
          ),
          catchError(error =>
            of(SyncActions.retrySyncErrorFailure({ errorId, error }))
          )
        )
      )
    )
  );

  /**
   * Réessayer plusieurs erreurs sélectionnées
   */
  retrySelectedErrors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.retrySelectedErrors),
      switchMap(({ errorIds }) =>
        from(this.syncErrorService.retrySelectedErrors(errorIds)).pipe(
          map(({ success, failed }) =>
            SyncActions.retrySelectedErrorsSuccess({ successCount: success, failedCount: failed })
          ),
          catchError(error =>
            of(SyncActions.retrySelectedErrorsFailure({ error }))
          )
        )
      )
    )
  );

  /**
   * Nettoyer les erreurs résolues
   */
  clearResolvedErrors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.clearResolvedErrors),
      switchMap(() =>
        from(this.syncErrorService.clearResolvedErrors()).pipe(
          map(() => SyncActions.clearResolvedErrorsSuccess()),
          catchError(error => of(SyncActions.clearResolvedErrorsFailure({ error })))
        )
      )
    )
  );

  // ==================== EFFETS VÉRIFICATION CAISSE ====================

  /**
   * Vérifier le statut de la caisse
   */
  checkCashDeskStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.checkCashDeskStatus),
      switchMap(() =>
        this.syncService.checkCashDeskStatus().pipe(
          map(isOpened => SyncActions.checkCashDeskStatusSuccess({ isOpened })),
          catchError(error => of(SyncActions.checkCashDeskStatusFailure({ error })))
        )
      )
    )
  );

  /**
   * Ouvrir la caisse
   */
  openCashDesk$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.openCashDesk),
      switchMap(() =>
        this.syncService.openCashDesk().pipe(
          map(cashDeskData => SyncActions.openCashDeskSuccess({ cashDeskData })),
          catchError(error => of(SyncActions.openCashDeskFailure({ error })))
        )
      )
    )
  );

  // ==================== EFFETS DE RECHARGEMENT AUTOMATIQUE ====================

  /**
   * Recharger les données après succès de synchronisation manuelle
   */
  reloadAfterManualSync$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.manualSyncSuccess, SyncActions.syncSingleEntitySuccess),
      delay(500), // Petit délai pour laisser le temps aux données de se mettre à jour
      map(() => SyncActions.loadManualSyncData())
    )
  );

  /**
   * Recharger les erreurs après retry réussi
   */
  reloadErrorsAfterRetry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.retrySyncErrorSuccess, SyncActions.retrySelectedErrorsSuccess),
      delay(500),
      map(() => SyncActions.loadSyncErrors())
    )
  );

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * Effectuer la synchronisation automatique avec émission de progression
   */
  private async performAutomaticSync(): Promise<any> {
    const progressUpdates: any[] = [];

    try {
      // Phase 1: Vérification caisse
      progressUpdates.push(SyncActions.automaticSyncProgress({
        progress: {
          currentPhase: 'cash-check',
          currentStep: 'Vérification de la caisse...',
          totalItems: 100,
          processedItems: 0,
          percentage: 0,
          errors: [],
          isActive: true,
          canCancel: true
        }
      }));

      // Simuler la progression avec des émissions
      for (const update of progressUpdates) {
        this.store.dispatch(update);
        await this.delay(100);
      }

      // Effectuer la synchronisation réelle
      const result = await this.syncService.synchronizeAllData();

      // Émettre le résultat final
      return SyncActions.automaticSyncSuccess({ result });

    } catch (error) {
      return SyncActions.automaticSyncFailure({ error });
    }
  }

  /**
   * Charger les données non synchronisées
   */
  private async loadUnsyncedData(): Promise<{ clients: any[], distributions: any[], recoveries: any[] }> {
    try {
      const [clients, distributions, recoveries] = await Promise.all([
        this.syncService.getUnsyncedClients(),
        this.syncService.getUnsyncedDistributions(),
        this.syncService.categorizeRecoveries().then(r => [...r.defaultStakes, ...r.specialStakes])
      ]);

      return { clients, distributions, recoveries };
    } catch (error) {
      console.error('Erreur lors du chargement des données non synchronisées:', error);
      throw error;
    }
  }

  /**
   * Effectuer la synchronisation manuelle
   */
  private async performManualSync(entityType: string, selectedIds: string[]): Promise<{ successCount: number, errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await this.syncSingleEntityById(entityType, id);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Erreur lors de la synchronisation de ${entityType} ${id}:`, error);
      }

      // Émettre la progression
      this.store.dispatch(SyncActions.manualSyncProgress({
        entityType: entityType as any,
        processed: successCount + errorCount,
        total: selectedIds.length,
        currentItem: id
      }));
    }

    return { successCount, errorCount };
  }

  /**
   * Synchroniser une entité individuelle par ID
   */
  private async syncSingleEntityById(entityType: string, entityId: string): Promise<void> {
    switch (entityType) {
      case 'client':
        // Get all unsynced clients and find the one with matching ID
        const clients = await this.syncService.getUnsyncedClients();
        const client = clients.find(c => c.id === entityId);
        if (client) {
          await this.syncService.syncSingleClient(client);
        }
        break;
      case 'distribution':
        // Get all unsynced distributions and find the one with matching ID
        const distributions = await this.syncService.getUnsyncedDistributions();
        const distribution = distributions.find(d => d.id === entityId);
        if (distribution) {
          await this.syncService.syncSingleDistribution(distribution);
        }
        break;
      case 'recovery':
        // Les recouvrements sont synchronisés différemment
        throw new Error('La synchronisation individuelle des recouvrements n\'est pas supportée');
      default:
        throw new Error(`Type d'entité non supporté: ${entityType}`);
    }
  }

  /**
   * Utilitaire pour créer un délai
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}