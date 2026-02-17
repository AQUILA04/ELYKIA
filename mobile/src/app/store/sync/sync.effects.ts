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
import { selectAutomaticSyncIsActive } from './sync.selectors';
import { SyncProgress, SyncPhase } from '../../models/sync.model';
import * as ClientActions from '../../store/client/client.actions';
import * as DistributionActions from '../../store/distribution/distribution.actions';
import * as RecoveryActions from '../../store/recovery/recovery.actions';
import * as TontineActions from '../../store/tontine/tontine.actions';
import { selectAuthUser } from '../../store/auth/auth.selectors';

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
    private recoveryService: RecoveryService
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

  // ==================== EFFETS SYNCHRONISATION MANUELLE ====================

  /**
   * Charger les données pour la synchronisation manuelle
   */
  loadManualSyncData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.loadManualSyncData),
      switchMap(() =>
        from(this.loadUnsyncedData()).pipe(
          map(({ clients, distributions, recoveries, tontineMembers, tontineCollections, tontineDeliveries }) =>
            SyncActions.loadManualSyncDataSuccess({ clients, distributions, recoveries, tontineMembers, tontineCollections, tontineDeliveries })
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
          // Note: loadTontineMembers depends on session ID, which is handled in the dashboard via session selector, 
          // but we can trigger session reload which cascades.
        } else {
          // Partial reload for manual/single sync
          const entityType = (action as any).entityType; // Type assertion as props vary slightly but entityType is common in usage context or mapped

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
            // Reload session to be safe, logic usually cascades to members
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
   * Charger les données non synchronisées
   */
  private async loadUnsyncedData(): Promise<{
    clients: any[],
    distributions: any[],
    recoveries: any[],
    tontineMembers: any[],
    tontineCollections: any[],
    tontineDeliveries: any[]
  }> {
    try {
      const [clients, distributions, recoveries, tontineMembers, tontineCollections, tontineDeliveries] = await Promise.all([
        this.syncService.getUnsyncedClients(),
        this.syncService.getUnsyncedDistributions(),
        this.syncService.categorizeRecoveries().then(r => [...r.defaultStakes, ...r.specialStakes]),
        this.syncService.getUnsyncedTontineMembers(),
        this.syncService.getUnsyncedTontineCollections(),
        this.syncService.getUnsyncedTontineDeliveries()
      ]);

      return { clients, distributions, recoveries, tontineMembers, tontineCollections, tontineDeliveries };
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
    try {
      switch (entityType) {
        case 'client':
          // Get all unsynced clients and find the one with matching ID
          const clients = await this.syncService.getUnsyncedClients();
          const client = clients.find(c => c.id === entityId);
          if (client) {
            try {
              await this.syncService.syncSingleClient(client);
            } catch (error) {
              await this.syncErrorService.logSyncError(
                'client',
                client.id,
                'MANUAL_SYNC',
                error,
                client,
                this.syncService.getClientDisplayName(client),
                client
              );
              throw error;
            }
          }
          break;
        case 'distribution':
          // Get all unsynced distributions and find the one with matching ID
          const distributions = await this.syncService.getUnsyncedDistributions();
          const distribution = distributions.find(d => d.id === entityId);
          if (distribution) {
            try {
              await this.syncService.syncSingleDistribution(distribution);
            } catch (error) {
              await this.syncErrorService.logSyncError(
                'distribution',
                distribution.id,
                'MANUAL_SYNC',
                error,
                distribution,
                this.syncService.getDistributionDisplayName(distribution),
                distribution
              );
              throw error;
            }
          }
          break;
        case 'recovery':
          // Synchroniser un recouvrement individuel
          const { defaultStakes, specialStakes } = await this.syncService.categorizeRecoveries();
          const allRecoveries = [...defaultStakes, ...specialStakes];
          const recovery = allRecoveries.find(r => r.id === entityId);
          if (recovery) {
            // syncDefaultDailyStakes and syncSpecialDailyStakes already handle error logging internally
            if (recovery.isDefaultStake) {
              await this.syncService.syncDefaultDailyStakes([recovery]);
            } else {
              await this.syncService.syncSpecialDailyStakes([recovery]);
            }
          }
          break;
        case 'tontine-member':
        case 'tontine-members':
          // Synchroniser un membre de tontine
          const tontineMembers = await this.syncService.getUnsyncedTontineMembers();
          const member = tontineMembers.find(m => m.id === entityId);
          if (member) {
            try {
              await this.syncService.syncSingleTontineMember(member);
            } catch (error) {
              await this.syncErrorService.logSyncError(
                'tontine-member',
                member.id,
                'MANUAL_SYNC',
                error,
                member,
                this.syncService.getTontineMemberDisplayName(member),
                member
              );
              throw error;
            }
          }
          break;
        case 'tontine-collection':
        case 'tontine-collections':
          // Synchroniser une collecte de tontine
          const tontineCollections = await this.syncService.getUnsyncedTontineCollections();
          const collection = tontineCollections.find(c => c.id === entityId);
          if (collection) {
            try {
              await this.syncService.syncSingleTontineCollection(collection);
            } catch (error) {
              await this.syncErrorService.logSyncError(
                'tontine-collection',
                collection.id,
                'MANUAL_SYNC',
                error,
                collection,
                this.syncService.getTontineCollectionDisplayName(collection),
                collection
              );
              throw error;
            }
          }
          break;
        case 'tontine-delivery':
        case 'tontine-deliveries':
          // Synchroniser une livraison de tontine
          const tontineDeliveries = await this.syncService.getUnsyncedTontineDeliveries();
          const delivery = tontineDeliveries.find(d => d.id === entityId);
          if (delivery) {
            try {
              await this.syncService.syncSingleTontineDelivery(delivery);
            } catch (error) {
              await this.syncErrorService.logSyncError(
                'tontine-delivery',
                delivery.id,
                'MANUAL_SYNC',
                error,
                delivery,
                this.syncService.getTontineDeliveryDisplayName(delivery),
                delivery
              );
              throw error;
            }
          }
          break;
        default:
          throw new Error(`Type d'entité non supporté: ${entityType}`);
      }
    } catch (error) {
      // If the error was already logged (re-thrown), we just let it propagate to the effect
      // If it happened during fetching (before logging), we might want to log it here contextually?
      // For now, assume fetching errors are rare and covered by generic logging or try/catch blocks within services.
      throw error;
    }
  }

  /**
   * Utilitaire pour créer un délai
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Afficher un toast de succès après une synchronisation manuelle réussie
   */
  showManualSyncSuccessToast$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.manualSyncSuccess),
      tap(async ({ entityType, successCount, errorCount }) => {
        const entityLabel = entityType === 'clients' ? 'client(s)' :
          entityType === 'distributions' ? 'distribution(s)' :
            'recouvrement(s)';

        let message = `${successCount} ${entityLabel} synchronisé(s) avec succès`;
        if (errorCount > 0) {
          message += ` (${errorCount} erreur(s))`;
        }

        // Utiliser ToastController via injection
        const { ToastController } = await import('@ionic/angular');
        const toastController = new ToastController();
        const toast = await toastController.create({
          message,
          duration: 3000,
          color: errorCount > 0 ? 'warning' : 'success',
          position: 'bottom'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

  /**
   * Afficher un toast de succès après une synchronisation d'entité unique réussie
   */
  showSingleEntitySyncSuccessToast$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.syncSingleEntitySuccess),
      tap(async ({ entityType }) => {
        const entityLabel = entityType === 'client' ? 'Client' :
          entityType === 'distribution' ? 'Distribution' :
            'Recouvrement';

        const { ToastController } = await import('@ionic/angular');
        const toastController = new ToastController();
        const toast = await toastController.create({
          message: `${entityLabel} synchronisé avec succès`,
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

  /**
   * Exporter automatiquement les logs de synchronisation après une synchronisation automatique réussie
   */
  exportSyncLogsAfterAutomaticSync$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.automaticSyncSuccess),
      tap(async ({ result }) => {
        try {
          const filePath = await this.syncLogsExportService.exportSyncLogsAfterSync(result);
          if (filePath) {
            console.log('Logs de synchronisation exportés automatiquement:', filePath);

            // Nettoyer les anciens fichiers de logs (garder les 30 derniers)
            await this.syncLogsExportService.cleanOldLogFiles();
          }
        } catch (error) {
          console.error('Erreur lors de l\'export automatique des logs:', error);
        }
      })
    ),
    { dispatch: false }
  );

  /**
   * Afficher un toast d'erreur après une synchronisation manuelle échouée
   */
  showManualSyncErrorToast$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SyncActions.manualSyncFailure, SyncActions.syncSingleEntityFailure),
      tap(async ({ error }) => {
        const { ToastController } = await import('@ionic/angular');
        const toastController = new ToastController();

        // Extract the most relevant error message
        let errorMessage = 'Erreur inconnue';
        if (error) {
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
        }

        const toast = await toastController.create({
          message: `Erreur lors de la synchronisation: ${errorMessage}`,
          duration: 4000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );
}
