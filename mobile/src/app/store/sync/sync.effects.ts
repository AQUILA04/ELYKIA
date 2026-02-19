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
  filter,
  debounceTime,
  distinctUntilChanged
} from 'rxjs/operators';

import { SyncMasterService } from '../../core/services/sync-master.service';
import { SyncErrorService } from '../../core/services/sync-error.service';
import { SyncLogsExportService } from '../../core/services/sync-logs-export.service';
import { ClientService } from '../../core/services/client.service';
import { DistributionService } from '../../core/services/distribution.service';
import { RecoveryService } from '../../core/services/recovery.service';
import { CashDeskService } from '../../core/services/cash-desk.service';

import * as SyncActions from './sync.actions';
import { selectAutomaticSyncIsActive, selectManualSyncPagination, selectParentSelectionState } from './sync.selectors';
import { SyncProgress, SyncPhase, ParentSelectionState } from '../../models/sync.model';
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

// Repositories (for findById)
import { ClientRepository } from '../../core/repositories/client.repository';
import { DistributionRepository } from '../../core/repositories/distribution.repository';
import { RecoveryRepository } from '../../core/repositories/recovery.repository';
import { TontineMemberRepository } from '../../core/repositories/tontine-member.repository';
import { TontineCollectionRepository } from '../../core/repositories/tontine-collection.repository';
import { TontineDeliveryRepository } from '../../core/repositories/tontine-delivery.repository';

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
    private syncMasterService: SyncMasterService,
    private syncErrorService: SyncErrorService,
    private syncLogsExportService: SyncLogsExportService,
    private clientService: ClientService,
    private distributionService: DistributionService,
    private recoveryService: RecoveryService,
    private cashDeskService: CashDeskService,

    // Repository Extensions
    private clientRepoExt: ClientRepositoryExtensions,
    private distRepoExt: DistributionRepositoryExtensions,
    private recRepoExt: RecoveryRepositoryExtensions,
    private tmRepoExt: TontineMemberRepositoryExtensions,
    private tcRepoExt: TontineCollectionRepositoryExtensions,
    private tdRepoExt: TontineDeliveryRepositoryExtensions,

    // Repositories
    private clientRepo: ClientRepository,
    private distRepo: DistributionRepository,
    private recRepo: RecoveryRepository,
    private tmRepo: TontineMemberRepository,
    private tcRepo: TontineCollectionRepository,
    private tdRepo: TontineDeliveryRepository,

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

  // ==================== EFFETS SÉLECTION PARENT (MODALE) ====================

  loadSyncedParentsPaginated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.loadSyncedParentsPaginated),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([action, user]) => !!user),
      switchMap(([action, user]) => {
        const username = user!.username;
        const { entityType, page, size, filters } = action;

        // Filter for synced items
        const queryFilters = { ...filters, isSync: true };

        let fetchObservable: Observable<Page<any>>;

        switch (entityType) {
          case 'client':
            fetchObservable = from(this.clientRepoExt.findByCommercialPaginated(username, page, size, queryFilters));
            break;
          case 'distribution':
            fetchObservable = from(this.distRepoExt.findViewsByCommercialPaginated(username, page, size, queryFilters));
            break;
          case 'tontine-member':
            fetchObservable = from(this.tmRepoExt.findByCommercialPaginated(username, page, size, queryFilters));
            break;
          default:
            return of(SyncActions.loadSyncedParentsPaginatedFailure({ entityType, error: 'Unknown entity type' }));
        }

        return fetchObservable.pipe(
          map((pageResult: Page<any>) => SyncActions.loadSyncedParentsPaginatedSuccess({
            entityType,
            data: pageResult.content,
            pageInfo: {
              page: pageResult.page,
              size: pageResult.size,
              totalPages: pageResult.totalPages,
              totalElements: pageResult.totalElements
            }
          })),
          catchError(error => of(SyncActions.loadSyncedParentsPaginatedFailure({ entityType, error })))
        );
      })
    )
  );

  searchSyncedParents$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.searchSyncedParents),
      debounceTime(300),
      distinctUntilChanged(),
      map(({ entityType, query }) => SyncActions.loadSyncedParentsPaginated({
        entityType,
        page: 0,
        size: 20,
        filters: { searchQuery: query }
      }))
    )
  );

  loadMoreSyncedParents$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.loadMoreSyncedParents),
      withLatestFrom(this.store.select(selectParentSelectionState)),
      switchMap(([action, parentSelectionState]) => {
        const { entityType } = action;
        let key: keyof ParentSelectionState;

        switch (entityType) {
          case 'client': key = 'clients'; break;
          case 'distribution': key = 'distributions'; break;
          case 'tontine-member': key = 'tontineMembers'; break;
          default: return EMPTY;
        }

        const currentEntityState = parentSelectionState[key] as any;
        const currentPagination = currentEntityState.pagination;

        if (!currentPagination || !currentPagination.hasMore || currentPagination.loading) {
          return EMPTY;
        }

        return of(SyncActions.loadSyncedParentsPaginated({
          entityType,
          page: currentPagination.page + 1,
          size: currentPagination.size,
          filters: { searchQuery: parentSelectionState.searchQuery }
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

  checkCashDeskStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.checkCashDeskStatus),
      switchMap(() =>
        this.cashDeskService.checkCashDeskStatus().pipe(
          map(isOpened => SyncActions.checkCashDeskStatusSuccess({ isOpened })),
          catchError(error => of(SyncActions.checkCashDeskStatusFailure({ error })))
        )
      )
    )
  );

  openCashDesk$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.openCashDesk),
      switchMap(() =>
        this.cashDeskService.openCashDesk().pipe(
          map(cashDeskData => SyncActions.openCashDeskSuccess({ cashDeskData })),
          catchError(error => of(SyncActions.openCashDeskFailure({ error })))
        )
      )
    )
  );

  // ==================== EFFETS DE RECHARGEMENT AUTOMATIQUE ====================

  reloadAfterManualSync$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.manualSyncSuccess, SyncActions.syncSingleEntitySuccess),
      delay(500),
      withLatestFrom(this.store.select(selectManualSyncPagination)),
      map(([action]) => {
        const entityType = (action as any).entityType;
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

        if (action.type === SyncActions.automaticSyncSuccess.type) {
          actionsToDispatch.push(ClientActions.loadClients({ commercialUsername: username }));
          actionsToDispatch.push(DistributionActions.loadDistributions({ commercialUsername: username }));
          actionsToDispatch.push(RecoveryActions.loadRecoveries({ commercialUsername: username }));
          actionsToDispatch.push(TontineActions.loadTontineSession());
        } else {
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

  reloadErrorsAfterRetry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.retrySyncErrorSuccess, SyncActions.retrySelectedErrorsSuccess),
      delay(500),
      map(() => SyncActions.loadSyncErrors())
    )
  );

  // ==================== MÉTHODES PRIVÉES ====================

  private async performAutomaticSync(): Promise<any> {
    const progressUpdates: any[] = [];

    try {
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

      for (const update of progressUpdates) {
        this.store.dispatch(update);
        await this.delay(100);
      }

      const result = await this.syncMasterService.synchronizeAllData();
      return SyncActions.automaticSyncSuccess({ result });

    } catch (error) {
      return SyncActions.automaticSyncFailure({ error });
    }
  }

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

  private async performSingleSync(service: any, entityId: string, entityType: string): Promise<void> {
    let entity;

    switch (entityType) {
      case 'client':
        entity = await this.clientRepo.findById(entityId);
        break;
      case 'distribution':
        entity = await this.distRepo.findById(entityId);
        break;
      case 'recovery':
        entity = await this.recRepo.findById(entityId);
        break;
      case 'tontine-member':
        entity = await this.tmRepo.findById(entityId);
        break;
      case 'tontine-collection':
        entity = await this.tcRepo.findById(entityId);
        break;
      case 'tontine-delivery':
        entity = await this.tdRepo.findById(entityId);
        break;
    }

    if (entity) {
      await service.syncSingle(entity);
    } else {
      throw new Error(`Entity ${entityType} with ID ${entityId} not found or already synced.`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
