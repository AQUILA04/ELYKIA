import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, from, timer, EMPTY, Observable } from 'rxjs';
import {
  map,
  catchError,
  switchMap,
  tap,
  withLatestFrom,
  takeUntil,
  concatMap,
  delay,
  filter
} from 'rxjs/operators';

import { SynchronizationService } from '../../core/services/synchronization.service';
import { SyncErrorService } from '../../core/services/sync-error.service';
import { SyncLogsExportService } from '../../core/services/sync-logs-export.service';
import { ClientService } from '../../core/services/client.service';
import { DistributionService } from '../../core/services/distribution.service';
import { RecoveryService } from '../../core/services/recovery.service';

import * as SyncActions from './sync.actions';
import { selectAutomaticSyncIsActive, selectManualSyncPagination } from './sync.selectors';
import { SyncProgress, SyncPhase } from '../../models/sync.model';
import * as ClientActions from '../../store/client/client.actions';
import * as DistributionActions from '../../store/distribution/distribution.actions';
import * as RecoveryActions from '../../store/recovery/recovery.actions';
import * as TontineActions from '../../store/tontine/tontine.actions';
import { selectAuthUser } from '../../store/auth/auth.selectors';

// Repository Extensions
import { ClientRepositoryExtensions } from '../../core/repositories/client.repository.extensions';
import { DistributionRepositoryExtensions } from '../../core/repositories/distribution.repository.extensions';
import { RecoveryRepositoryExtensions } from '../../core/repositories/recovery.repository.extensions';
import { TontineMemberRepositoryExtensions } from '../../core/repositories/tontine-member.repository.extensions';
import { TontineCollectionRepositoryExtensions } from '../../core/repositories/tontine-collection.repository.extensions';
import { TontineDeliveryRepositoryExtensions } from '../../core/repositories/tontine-delivery.repository.extensions';

// Domain Specific Sync Services
import { ClientSyncService } from '../../core/services/sync/client-sync.service';
import { DistributionSyncService } from '../../core/services/sync/distribution-sync.service';
import { RecoverySyncService } from '../../core/services/sync/recovery-sync.service';
import { TontineMemberSyncService } from '../../core/services/sync/tontine-member-sync.service';
import { TontineCollectionSyncService } from '../../core/services/sync/tontine-collection-sync.service';
import { TontineDeliverySyncService } from '../../core/services/sync/tontine-delivery-sync.service';
import { Page } from '../../core/repositories/repository.interface';

@Injectable()
export class SyncEffects {

  constructor(
    private actions$: Actions,
    private store: Store,
    private syncService: SynchronizationService,
    private syncErrorService: SyncErrorService,
    private syncLogsExportService: SyncLogsExportService,
    private clientService: ClientService,
    private distributionService: DistributionService,
    private recoveryService: RecoveryService,

    // Repository Extensions
    private clientRepoExt: ClientRepositoryExtensions,
    private distRepoExt: DistributionRepositoryExtensions,
    private recRepoExt: RecoveryRepositoryExtensions,
    private tmRepoExt: TontineMemberRepositoryExtensions,
    private tcRepoExt: TontineCollectionRepositoryExtensions,
    private tdRepoExt: TontineDeliveryRepositoryExtensions,

    // Domain Sync Services
    private clientSync: ClientSyncService,
    private distSync: DistributionSyncService,
    private recSync: RecoverySyncService,
    private tmSync: TontineMemberSyncService,
    private tcSync: TontineCollectionSyncService,
    private tdSync: TontineDeliverySyncService
  ) { }

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

  // ==================== EFFETS SYNCHRONISATION MANUELLE (PAGINATION) ====================

  /**
   * Charger les données paginées pour la synchronisation manuelle
   */
  loadManualSyncDataPaginated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.loadManualSyncDataPaginated),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([action, user]) => !!user),
      switchMap(([action, user]) => {
        const username = user!.username;
        const { entityType, page, size, filters } = action;

        // Common filter for unsynced items
        const queryFilters = { ...filters, isSync: false };

        let fetchObservable: Observable<Page<any>>;

        switch (entityType) {
          case 'client':
            fetchObservable = from(this.clientRepoExt.findByCommercialPaginated(username, page, size, queryFilters));
            break;
          case 'distribution':
            fetchObservable = from(this.distRepoExt.findByCommercialPaginated(username, page, size, queryFilters));
            break;
          case 'recovery':
            fetchObservable = from(this.recRepoExt.findByCommercialPaginated(username, page, size, queryFilters));
            break;
          case 'tontine-member':
            fetchObservable = from(this.tmRepoExt.findByCommercialPaginated(username, page, size, queryFilters));
            break;
          case 'tontine-collection':
            fetchObservable = from(this.tcRepoExt.findByCommercialPaginated(username, page, size, queryFilters));
            break;
          case 'tontine-delivery':
            fetchObservable = from(this.tdRepoExt.findByCommercialPaginated(username, page, size, queryFilters));
            break;
          default:
            return of(SyncActions.loadManualSyncDataPaginatedFailure({ entityType, error: 'Unknown entity type' }));
        }

        return fetchObservable.pipe(
          map((pageResult: Page<any>) => SyncActions.loadManualSyncDataPaginatedSuccess({
            entityType,
            data: pageResult.content,
            pageInfo: {
              page: pageResult.page,
              size: pageResult.size,
              totalPages: pageResult.totalPages,
              totalElements: pageResult.totalElements
            }
          })),
          catchError(error => of(SyncActions.loadManualSyncDataPaginatedFailure({ entityType, error })))
        );
      })
    )
  );

  /**
   * Charger plus de données (Infinite Scroll)
   */
  loadMoreManualSyncData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.loadMoreManualSyncData),
      withLatestFrom(this.store.select(selectManualSyncPagination)),
      switchMap(([action, paginationState]) => {
        const { entityType } = action;
        let currentPagination;

        switch (entityType) {
          case 'client': currentPagination = paginationState.clients; break;
          case 'distribution': currentPagination = paginationState.distributions; break;
          case 'recovery': currentPagination = paginationState.recoveries; break;
          case 'tontine-member': currentPagination = paginationState.tontineMembers; break;
          case 'tontine-collection': currentPagination = paginationState.tontineCollections; break;
          case 'tontine-delivery': currentPagination = paginationState.tontineDeliveries; break;
        }

        if (!currentPagination || !currentPagination.hasMore || currentPagination.loading) {
          return EMPTY;
        }

        return of(SyncActions.loadManualSyncDataPaginated({
          entityType,
          page: currentPagination.page + 1,
          size: currentPagination.size
        }));
      })
    )
  );

  /**
   * Synchronisation manuelle par type d'entité (Batch)
   */
  startManualSync$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.startManualSync),
      switchMap(({ entityType, selectedIds }) => {
        let service;
        let singularEntityType: any = entityType;

        if (entityType === 'clients' || entityType === 'client') { service = this.clientSync; singularEntityType = 'client'; }
        else if (entityType === 'distributions' || entityType === 'distribution') { service = this.distSync; singularEntityType = 'distribution'; }
        else if (entityType === 'recoveries' || entityType === 'recovery') { service = this.recSync; singularEntityType = 'recovery'; }
        else if (entityType === 'tontine-members' || entityType === 'tontine-member') { service = this.tmSync; singularEntityType = 'tontine-member'; }
        else if (entityType === 'tontine-collections' || entityType === 'tontine-collection') { service = this.tcSync; singularEntityType = 'tontine-collection'; }
        else if (entityType === 'tontine-deliveries' || entityType === 'tontine-delivery') { service = this.tdSync; singularEntityType = 'tontine-delivery'; }
        else { return of(SyncActions.manualSyncFailure({ entityType, error: 'Unknown entity type' })); }

        return from(this.performBatchSync(service, selectedIds, singularEntityType)).pipe(
          map(({ successCount, errorCount }) =>
            SyncActions.manualSyncSuccess({ entityType, successCount, errorCount })
          ),
          catchError(error =>
            of(SyncActions.manualSyncFailure({ entityType, error }))
          )
        );
      })
    )
  );

  /**
   * Synchronisation d'une entité individuelle
   */
  syncSingleEntity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.syncSingleEntity),
      concatMap(({ entityType, entityId }) => {
        let service;
        // Map entityType to service
        if (entityType === 'client') service = this.clientSync;
        else if (entityType === 'distribution') service = this.distSync;
        else if (entityType === 'recovery') service = this.recSync;
        else if (entityType === 'tontine-member') service = this.tmSync;
        else if (entityType === 'tontine-collection') service = this.tcSync;
        else if (entityType === 'tontine-delivery') service = this.tdSync;
        else return of(SyncActions.syncSingleEntityFailure({ entityType, entityId, error: 'Unknown entity type' }));

        return from(this.performSingleSync(service, entityId, entityType)).pipe(
          map(() =>
            SyncActions.syncSingleEntitySuccess({ entityType, entityId })
          ),
          catchError(error =>
            of(SyncActions.syncSingleEntityFailure({ entityType, entityId, error }))
          )
        );
      })
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
      // Reload current tab data
      withLatestFrom(this.store.select(selectManualSyncPagination)), // We might need active tab but let's just reload all or specific
      // Actually, we should reload the specific entity type that was synced.
      // But the action props contain entityType.
      map(([action]) => {
        const entityType = (action as any).entityType;
        // Map plural to singular if needed
        let singularType = entityType;
        if (entityType === 'clients') singularType = 'client';
        else if (entityType === 'distributions') singularType = 'distribution';
        else if (entityType === 'recoveries') singularType = 'recovery';
        else if (entityType === 'tontine-members') singularType = 'tontine-member';
        else if (entityType === 'tontine-collections') singularType = 'tontine-collection';
        else if (entityType === 'tontine-deliveries') singularType = 'tontine-delivery';

        return SyncActions.loadManualSyncDataPaginated({
          entityType: singularType,
          page: 0,
          size: 20
        });
      })
    )
  );

  /**
   * Recharger les stores ngrx après une synchronisation réussie pour mettre à jour l'UI
   */
  reloadFeatureStores$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        SyncActions.manualSyncSuccess,
        SyncActions.syncSingleEntitySuccess,
        SyncActions.automaticSyncSuccess
      ),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([action, user]) => !!user),
      concatMap(([action, user]) => {
        const username = user!.username;
        const actionsToDispatch = [];

        // Determine which stores to reload based on the action and entity type
        if (action.type === SyncActions.automaticSyncSuccess.type) {
          // Full reload for automatic sync
          actionsToDispatch.push(ClientActions.loadClients({ commercialUsername: username }));
          actionsToDispatch.push(DistributionActions.loadDistributions({ commercialUsername: username }));
          actionsToDispatch.push(RecoveryActions.loadRecoveries({ commercialUsername: username }));
          actionsToDispatch.push(TontineActions.loadTontineSession());
        } else {
          // Partial reload for manual/single sync
          const entityType = (action as any).entityType;

          if (['client', 'clients'].includes(entityType)) {
            actionsToDispatch.push(ClientActions.loadClients({ commercialUsername: username }));
          }
          if (['distribution', 'distributions'].includes(entityType)) {
            actionsToDispatch.push(DistributionActions.loadDistributions({ commercialUsername: username }));
          }
          if (['recovery', 'recoveries'].includes(entityType)) {
            actionsToDispatch.push(RecoveryActions.loadRecoveries({ commercialUsername: username }));
          }
          if (['tontine-member', 'tontine-members', 'tontine-collection', 'tontine-collections'].includes(entityType)) {
            actionsToDispatch.push(TontineActions.loadTontineSession());
          }
        }

        return from(actionsToDispatch);
      })
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
   * Helper to perform batch sync for selected IDs
   */
  private async performBatchSync(service: any, selectedIds: string[], entityType: string): Promise<{ successCount: number, errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await this.performSingleSync(service, id, entityType);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Erreur lors de la synchronisation de ${entityType} ${id}:`, error);
      }
    }

    return { successCount, errorCount };
  }

  /**
   * Synchroniser une entité individuelle par ID
   */
  private async performSingleSync(service: any, entityId: string, entityType: string): Promise<void> {
    // Fetch entity
    let entity;

    switch (entityType) {
      case 'client':
        const clients = await this.syncService.getUnsyncedClients();
        entity = clients.find(c => c.id === entityId);
        break;
      case 'distribution':
        const distributions = await this.syncService.getUnsyncedDistributions();
        entity = distributions.find(d => d.id === entityId);
        break;
      case 'recovery':
        const { defaultStakes, specialStakes } = await this.syncService.categorizeRecoveries();
        entity = [...defaultStakes, ...specialStakes].find(r => r.id === entityId);
        break;
      case 'tontine-member':
        const members = await this.syncService.getUnsyncedTontineMembers();
        entity = members.find(m => m.id === entityId);
        break;
      case 'tontine-collection':
        const collections = await this.syncService.getUnsyncedTontineCollections();
        entity = collections.find(c => c.id === entityId);
        break;
      case 'tontine-delivery':
        const deliveries = await this.syncService.getUnsyncedTontineDeliveries();
        entity = deliveries.find(d => d.id === entityId);
        break;
    }

    if (entity) {
      await service.syncSingle(entity);
    } else {
      throw new Error(`Entity ${entityType} with ID ${entityId} not found or already synced.`);
    }
  }

  /**
   * Utilitaire pour créer un délai
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
