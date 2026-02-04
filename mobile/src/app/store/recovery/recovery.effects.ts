import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, from, concatMap } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { catchError, map, switchMap, withLatestFrom, tap } from 'rxjs/operators';
import * as RecoveryActions from './recovery.actions';
import { RecoveryService } from '../../core/services/recovery.service';
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

@Injectable()
export class RecoveryEffects {
  constructor(
    private actions$: Actions,
    private recoveryService: RecoveryService,
    private printingService: PrintingService,
    private store: Store,
    private modalController: ModalController
  ) {}

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
      tap(({ recovery }) => console.log('[EFFECT] processRecovery$: Triggered', recovery)),
      switchMap(({ recovery, distribution }) =>
        from(this.recoveryService.createRecovery(recovery)).pipe(
          switchMap((createdRecovery) => {
            // Préparer la nouvelle transaction pour l'historique
            console.log('Dans le switchMap de processRecovery');
            const newTransaction: Partial<Transaction> = {
              type: 'PAYMENT',
              amount: createdRecovery.amount,
              date: createdRecovery.paymentDate,
              clientId: createdRecovery.clientId,
              referenceId: createdRecovery.distributionId,
              isLocal: true,
              isSync: false,
            };

            console.log('new transaction créer', newTransaction);
            console.log('distribution récupéré', distribution);

            // Calcule les nouveaux montants de la distribution de manière sécurisée
            const oldPaidAmount = distribution.paidAmount || 0;
            const oldRemainingAmount = distribution.remainingAmount || 0;
            const newPaidAmount = oldPaidAmount + createdRecovery.amount;
            const newRemainingAmount = oldRemainingAmount - createdRecovery.amount;

            console.log('[EFFECT] processRecovery$: Dispatching actions', { newTransaction, newPaidAmount, newRemainingAmount });

            // Vérifier s'il reste d'autres crédits actifs pour ce client
            return from(this.recoveryService.getClientActiveCredits(createdRecovery.clientId)).pipe(
              switchMap(activeCredits => {
                // On filtre pour exclure la distribution actuelle si elle est soldée
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
            console.error('[EFFECT] processRecovery$: Error inside switchMap', error);
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
}
