import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, from, concatMap, EMPTY } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { catchError, map, switchMap, exhaustMap, withLatestFrom, tap } from 'rxjs/operators';
import * as RecoveryActions from './recovery.actions';
import { RecoveryCreationInFlightError, RecoveryService } from '../../core/services/recovery.service';
import { LoggerService } from '../../core/services/logger.service';
import { PrintingService, PrintableRecovery } from '../../core/services/printing.service';
import * as TransactionActions from '../transaction/transaction.actions';
import * as DistributionActions from '../distribution/distribution.actions';
import { selectDistributionById } from '../distribution/distribution.selectors';
import { selectClientById, selectAllClients } from '../client/client.selectors';
import { selectAuthUser } from '../auth/auth.selectors';
import { RecoverySummaryModalComponent } from '../../shared/components/recovery-summary-modal/recovery-summary-modal.component';
import { Transaction } from '../../models/transaction.model';
import * as ClientActions from '../client/client.actions';
import { filter, take } from 'rxjs/operators';
import { RecoveryRepositoryExtensions } from '../../core/repositories/recovery.repository.extensions';
import * as KpiActions from '../kpi/kpi.actions';
import { selectDistributionRecoveryPagination } from './recovery.selectors';

@Injectable()
export class RecoveryEffects {
  constructor(
    private actions$: Actions,
    private recoveryService: RecoveryService,
    private printingService: PrintingService,
    private store: Store,
    private modalController: ModalController,
    private recoveryRepositoryExtensions: RecoveryRepositoryExtensions,
    private log: LoggerService
  ) { }

  loadAndSelectClient$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(RecoveryActions.loadAndSelectClient),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([, user]) => {
        if (!user) {
          this.store.dispatch(RecoveryActions.loadClientCreditsFailure({ error: 'User not authenticated' }));
          return false;
        }
        return true;
      }),
      switchMap(([{ clientId }, user]) => {
        return this.store.select(selectClientById(clientId)).pipe(
          take(1),
          map(client => {
            if (client) {
              return { client, needsLoad: false, user: user!, clientId };
            }
            return { client: null, needsLoad: true, user: user!, clientId };
          })
        );
      }),
      switchMap(({ client, needsLoad, user, clientId }) => {
        if (!needsLoad && client) {
          return [
            RecoveryActions.setSelectedClient({ client }),
            RecoveryActions.loadClientCredits({ clientId }),
          ];
        }

        this.store.dispatch(ClientActions.loadClients({ commercialUsername: user.username }));

        return this.actions$.pipe(
          ofType(ClientActions.loadClientsSuccess),
          take(1),
          switchMap(() => {
            return this.store.select(selectClientById(clientId)).pipe(
              take(1),
              switchMap(newlyLoadedClient => {
                if (newlyLoadedClient) {
                  return [
                    RecoveryActions.setSelectedClient({ client: newlyLoadedClient }),
                    RecoveryActions.loadClientCredits({ clientId }),
                  ];
                } else {
                  return of(RecoveryActions.loadClientCreditsFailure({ error: `Client not found after loading: ${clientId}` }));
                }
              })
            );
          })
        );
      })
    );
  });
  /**
   * Charge les recouvrements depuis le service.
   */
  loadRecoveries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.loadRecoveries),
      switchMap((action) =>
        this.recoveryService.getRecoveriesByCommercialUsername(action.commercialUsername).pipe(
          map((recoveries) => RecoveryActions.loadRecoveriesSuccess({ recoveries })),
          catchError((error) => of(RecoveryActions.loadRecoveriesFailure({ error: error.message })))
        )
      )
    )
  );

  /**
   * Charge les crédits actifs pour un client sélectionné.
   */
  loadClientCredits$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.loadClientCredits),
      switchMap(({ clientId }) =>
        from(this.recoveryService.getClientActiveCredits(clientId)).pipe(
          map((credits) => RecoveryActions.loadClientCreditsSuccess({ credits })),
          catchError((error) => of(RecoveryActions.loadClientCreditsFailure({ error: error.message })))
        )
      )
    )
  );

  /**
   * Valide le montant d'un recouvrement pour une distribution donnée.
   */
  validateRecoveryAmount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.validateRecoveryAmount),
      switchMap(({ amount, distributionId }) =>
        this.recoveryService.validateRecoveryAmount(amount, distributionId).pipe(
          map(({ isValid, message }) => RecoveryActions.validateRecoveryAmountSuccess({ isValid, message })),
          catchError((error) => of(RecoveryActions.validateRecoveryAmountFailure({ error: error.message })))
        )
      )
    )
  );

  /**
   * **Effet principal et corrigé pour le processus de recouvrement.**
   * 1. Écoute l'action `createRecovery` qui contient les données du recouvrement ET la distribution associée.
   * 2. Appelle le service pour sauvegarder le recouvrement en base de données.
   * 3. En cas de succès, distribue un tableau de 3 actions pour mettre à jour tous les états concernés de manière atomique.
   */
  processRecovery$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.createRecovery),
      tap(({ recovery, distribution }) => {
        void this.log.log(
          `[RecoveryEffects][ACTION_RECEIVED] client=${recovery.clientId} distribution=${recovery.distributionId} ` +
          `amount=${recovery.amount} creditRef=${distribution.reference} paymentDate=${recovery.paymentDate}`
        );
      }),
      exhaustMap(({ recovery, distribution, keepReliquat }) =>
        from(this.recoveryService.createRecovery(recovery, keepReliquat !== undefined ? keepReliquat : true)).pipe(
          switchMap((createdRecovery) => {
            void this.log.log(
              `[RecoveryEffects][CREATE_SUCCESS] recoveryId=${createdRecovery.id} amount=${createdRecovery.amount} ` +
              `client=${createdRecovery.clientId} paymentDate=${createdRecovery.paymentDate}`
            );

            const newTransaction: Partial<Transaction> = {
              type: 'PAYMENT',
              amount: createdRecovery.amount,
              date: createdRecovery.paymentDate,
              clientId: createdRecovery.clientId,
              referenceId: createdRecovery.distributionId,
              isLocal: true,
              isSync: false,
            };

            const oldPaidAmount = distribution.paidAmount || 0;
            const oldRemainingAmount = distribution.remainingAmount || 0;
            const newPaidAmount = oldPaidAmount + createdRecovery.amount;
            const newRemainingAmount = oldRemainingAmount - createdRecovery.amount;

            void this.log.log(
              `[RecoveryEffects][DISTRIBUTION_UPDATE] distributionId=${createdRecovery.distributionId} ` +
              `paid=${oldPaidAmount}->${newPaidAmount} remaining=${oldRemainingAmount}->${newRemainingAmount}`
            );

            return from(this.recoveryService.getClientActiveCredits(createdRecovery.clientId)).pipe(
              switchMap(activeCredits => {
                const remainingCredits = activeCredits.filter(c => c.id !== createdRecovery.distributionId || newRemainingAmount > 0);
                const hasActiveCredits = remainingCredits.length > 0;

                const actions: any[] = [
                  RecoveryActions.createRecoverySuccess({ recovery: createdRecovery }),
                  TransactionActions.addTransaction({ transaction: newTransaction }),
                  DistributionActions.updateDistributionAmounts({
                    distributionId: createdRecovery.distributionId,
                    paidAmount: newPaidAmount,
                    remainingAmount: newRemainingAmount,
                  }),
                ];

                if (!hasActiveCredits) {
                  actions.push(ClientActions.updateClientCreditStatus({ clientId: createdRecovery.clientId, creditInProgress: false }));
                } else {
                  actions.push(ClientActions.loadClientViewsUpdate());
                }

                return actions;
              })
            );
          }),
          catchError(error => {
            if (error instanceof RecoveryCreationInFlightError) {
              void this.log.log(
                `[RecoveryEffects][ACTION_DROPPED] Duplicate createRecovery blocked while another is in flight. ` +
                `client=${recovery.clientId} amount=${recovery.amount}`
              );
              return EMPTY;
            }
            void this.log.error('[RecoveryEffects][CREATE_FAILURE]', error);
            return of(RecoveryActions.createRecoveryFailure({ error: error.message }));
          })
        )
      )
    )
  );

  showRecoverySummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.showRecoverySummary),
      withLatestFrom(this.store.select(selectAuthUser)),
      tap(async ([{ recovery, distribution, client }, user]) => {
        const modal = await this.modalController.create({
          component: RecoverySummaryModalComponent,
          componentProps: { recovery, distribution, client }
        });
        await modal.present();
        const { data } = await modal.onDidDismiss();
        if (data?.printed) {
          const printableRecovery: PrintableRecovery = {
            recovery,
            distribution,
            client,
            commercial: {
              name: user ? user.username : 'N/A',
            }
          };
          this.store.dispatch(RecoveryActions.printRecoveryReceipt({ printableRecovery }));
        }
      })
    ),
    { dispatch: false }
  );

  printRecoveryReceipt$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.printRecoveryReceipt),
      switchMap(({ printableRecovery }) =>
        from(this.printingService.printRecoveryReceipt(printableRecovery)).pipe(
          map(() => RecoveryActions.printRecoveryReceiptSuccess()),
          catchError(error => of(RecoveryActions.printRecoveryReceiptFailure({ error: error.message })))
        )
      )
    )
  );

  deleteRecoveriesByDistributionIds$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.deleteRecoveriesByDistributionIds),
      switchMap(action => {
        return from(this.recoveryService.deleteRecoveriesByDistributionIds(action.distributionIds)).pipe(
          map(() => RecoveryActions.loadRecoveries({ commercialUsername: '' })), // Reload recoveries
          catchError(error => of(RecoveryActions.loadRecoveriesFailure({ error })))
        );
      })
    )
  );

  // ==================== PAGINATION EFFECTS ====================

  loadFirstPageRecoveries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.loadFirstPageRecoveries),
      switchMap((action) => {
        if (!action.commercialId) {
          return of(RecoveryActions.loadFirstPageRecoveriesFailure({
            error: 'commercialId is required for security'
          }));
        }

        return from(
          this.recoveryRepositoryExtensions.findViewsByCommercialPaginated(
            action.commercialId,
            0, // First page
            action.pageSize || 20,
            action.filters
          )
        ).pipe(
          map((page) => RecoveryActions.loadFirstPageRecoveriesSuccess({ page })),
          catchError((error) => of(RecoveryActions.loadFirstPageRecoveriesFailure({ error: error.message })))
        );
      })
    )
  );

  loadNextPageRecoveries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.loadNextPageRecoveries),
      withLatestFrom(this.store.select(state => (state as any).recovery?.pagination)),
      switchMap(([action, pagination]) => {
        if (!action.commercialId) {
          return of(RecoveryActions.loadNextPageRecoveriesFailure({
            error: 'commercialId is required for security'
          }));
        }

        if (!pagination || !pagination.hasMore || pagination.loading) {
          // No more pages to load or already loading
          return of({ type: 'NO_OP' });
        }

        const nextPage = pagination.currentPage + 1;

        return from(
          this.recoveryRepositoryExtensions.findViewsByCommercialPaginated(
            action.commercialId,
            nextPage,
            pagination.pageSize,
            action.filters
          )
        ).pipe(
          map((page) => RecoveryActions.loadNextPageRecoveriesSuccess({ page })),
          catchError((error) => of(RecoveryActions.loadNextPageRecoveriesFailure({ error: error.message })))
        );
      })
    )
  );
  // ==================== KPI REFRESH AFTER RECOVERY ====================

  /**
   * Rafraîchir les KPIs après la création d'un recouvrement.
   * Utilise le filtre par défaut du dashboard (mois en cours).
   */
  refreshKpiAfterRecovery$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.createRecoverySuccess),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([_, user]) => !!user),
      switchMap(([_, user]) => {
        const username = user!.username;
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endDate = now.toISOString().split('T')[0];
        const dateFilter = { startDate, endDate };

        console.log('[RecoveryEffects] Refreshing KPIs after recovery creation');

        return [
          KpiActions.loadRecoveryKpi({ commercialId: username, dateFilter }),
          KpiActions.loadDistributionKpi({ commercialId: username, dateFilter })
        ];
      })
    )
  );

  // ==================== DISTRIBUTION PAGINATION EFFECTS ====================

  loadFirstPageDistributionRecoveries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.loadFirstPageDistributionRecoveries),
      switchMap((action) => {
        if (!action.commercialId) {
          return of(RecoveryActions.loadFirstPageDistributionRecoveriesFailure({
            error: 'commercialId is required for security'
          }));
        }
        return from(
          this.recoveryRepositoryExtensions.findViewsByCommercialPaginated(
            action.commercialId,
            0,
            action.pageSize || 20,
            { distributionId: action.distributionId }
          )
        ).pipe(
          map((page) => RecoveryActions.loadFirstPageDistributionRecoveriesSuccess({ page })),
          catchError((error) => of(RecoveryActions.loadFirstPageDistributionRecoveriesFailure({ error: error.message })))
        );
      })
    )
  );

  loadNextPageDistributionRecoveries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecoveryActions.loadNextPageDistributionRecoveries),
      withLatestFrom(this.store.select(selectDistributionRecoveryPagination)),
      switchMap(([action, pagination]) => {
        if (!action.commercialId) {
          return of(RecoveryActions.loadNextPageDistributionRecoveriesFailure({
            error: 'commercialId is required for security'
          }));
        }
        if (!pagination.hasMore || pagination.loading) {
          return of({ type: 'NO_OP' });
        }
        const nextPage = pagination.currentPage + 1;
        return from(
          this.recoveryRepositoryExtensions.findViewsByCommercialPaginated(
            action.commercialId,
            nextPage,
            pagination.pageSize,
            { distributionId: action.distributionId }
          )
        ).pipe(
          map((page) => RecoveryActions.loadNextPageDistributionRecoveriesSuccess({ page })),
          catchError((error) => of(RecoveryActions.loadNextPageDistributionRecoveriesFailure({ error: error.message })))
        );
      })
    )
  );

}
