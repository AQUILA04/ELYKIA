import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { concatMap, from, mergeMap, of } from 'rxjs';
import { map, catchError, switchMap, tap, withLatestFrom, filter, take } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';

import { DistributionService } from '../../core/services/distribution.service';
import { PrintingService } from '../../core/services/printing.service';
import * as DistributionActions from './distribution.actions';

import * as ClientActions from '../client/client.actions';
import { selectAuthUser } from '../auth/auth.selectors';

import { selectDistributionsByClientId } from './distribution.selectors';
import { deleteRecoveriesByDistributionIds } from '../recovery/recovery.actions';
import * as ArticleActions from '../article/article.actions';
import * as CommercialStockActions from '../commercial-stock/commercial-stock.actions';
import { selectDistributionState } from './distribution.selectors';
import { DistributionRepositoryExtensions } from '../../core/repositories/distribution.repository.extensions';

@Injectable()
export class DistributionEffects {

  constructor(
    private actions$: Actions,
    private distributionService: DistributionService,
    private printingService: PrintingService,
    private toastController: ToastController,
    private store: Store,
    private distributionRepositoryExtensions: DistributionRepositoryExtensions
  ) { }

  // Load Distributions Effect - from local database only
  loadDistributions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.loadDistributions, DistributionActions.refreshDistributions),
      switchMap((action: { commercialUsername: string }) =>
        this.distributionService.getDistributionsByCommercialUsername(action.commercialUsername).pipe(
          map(distributions => DistributionActions.loadDistributionsSuccess({ distributions })),
          catchError(error => {
            console.error('Load distributions failed:', error);
            return of(DistributionActions.loadDistributionsFailure({
              error: error.message || 'Erreur lors du chargement des distributions'
            }));
          })
        )
      )
    )
  );

  /**
   * Pagination Effects (US001/US002)
   */
  loadFirstPageDistributions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.loadFirstPageDistributions),
      // Use DEFAULT_PAGE_SIZE = 20 from config, hardcoded for now or use constant
      switchMap(({ commercialUsername, filters }) =>
        this.distributionService.getDistributionsPaginated(0, 20, filters).pipe( // Page 0, Size 20
          map(page => DistributionActions.loadFirstPageDistributionsSuccess({
            distributions: page.content,
            totalElements: page.totalElements,
            totalPages: page.totalPages
          })),
          catchError(error => of(DistributionActions.loadFirstPageDistributionsFailure({ error: error.message })))
        )
      )
    )
  );

  loadNextPageDistributions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.loadNextPageDistributions),
      withLatestFrom(this.store.select(selectDistributionState)), // To get current page
      switchMap(([{ commercialUsername, filters }, state]) => {
        const nextPage = state.pagination.currentPage + 1;
        return this.distributionService.getDistributionsPaginated(nextPage, 20, filters).pipe(
          map(page => DistributionActions.loadNextPageDistributionsSuccess({
            distributions: page.content
          })),
          catchError(error => of(DistributionActions.loadNextPageDistributionsFailure({ error: error.message })))
        );
      })
    )
  );

  // Load Available Articles Effect - from local database only
  loadAvailableArticles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.loadAvailableArticles, DistributionActions.refreshAvailableArticles),
      switchMap(() =>
        this.distributionService.getAvailableArticles().pipe(
          map(articles => DistributionActions.loadAvailableArticlesSuccess({ articles })),
          catchError(error => {
            console.error('Load available articles failed:', error);
            return of(DistributionActions.loadAvailableArticlesFailure({
              error: error.message || 'Erreur lors du chargement des articles'
            }));
          })
        )
      )
    )
  );

  loadFirstPageAvailableArticles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.loadFirstPageAvailableArticles),
      switchMap(({ commercialUsername, pageSize, filters }) =>
        this.distributionService.getAvailableArticlesPaginated(0, pageSize || 20, filters).pipe(
          map(page => DistributionActions.loadFirstPageAvailableArticlesSuccess({
            articles: page.content,
            totalElements: page.totalElements,
            totalPages: page.totalPages
          })),
          catchError(error => of(DistributionActions.loadFirstPageAvailableArticlesFailure({ error: error.message })))
        )
      )
    )
  );

  loadNextPageAvailableArticles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.loadNextPageAvailableArticles),
      withLatestFrom(this.store.select(selectDistributionState)),
      switchMap(([{ commercialUsername, pageSize, filters }, state]) => {
        const nextPage = state.articlesPagination.currentPage + 1;
        return this.distributionService.getAvailableArticlesPaginated(nextPage, pageSize || 20, filters).pipe(
          map(page => DistributionActions.loadNextPageAvailableArticlesSuccess({
            articles: page.content
          })),
          catchError(error => of(DistributionActions.loadNextPageAvailableArticlesFailure({ error: error.message })))
        );
      })
    )
  );

  // Create Distribution Effect - save to local database only
  createDistribution$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.createDistribution),
      switchMap(({ distributionData }) =>
        this.distributionService.createDistribution(distributionData).pipe(
          map(distribution => DistributionActions.createDistributionSuccess({ distribution })),
          catchError(error => {
            console.error('Create distribution failed:', error);
            return of(DistributionActions.createDistributionFailure({
              error: error.message || 'Erreur lors de la création de la distribution'
            }));
          })
        )
      )
    )
  );

  // Print Receipt Effect
  printReceipt$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.printReceipt),
      switchMap(({ printableDistribution }) =>
        from(this.printingService.printReceipt(printableDistribution)).pipe(
          map(() => DistributionActions.printReceiptSuccess()),
          catchError(error => of(DistributionActions.printReceiptFailure({ error: error.message })))
        )
      )
    )
  );

  // Update Distribution Status Effect - local database only
  updateDistributionStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.updateDistributionStatus),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([, user]) => !!user),
      switchMap(([{ distributionId, status }, user]) =>
        this.distributionService.updateDistributionStatus(distributionId, status).pipe(
          switchMap(distribution => [
            DistributionActions.updateDistributionStatusSuccess({ distribution }),
            DistributionActions.loadDistributions({ commercialUsername: user!.username })
          ]),
          catchError(error => {
            console.error('Update distribution status failed:', error);
            return of(DistributionActions.updateDistributionStatusFailure({
              error: error.message || 'Erreur lors de la mise à jour du statut'
            }));
          })
        )
      )
    )
  );

  // Delete Distribution Effect - local database only
  deleteDistribution$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.deleteDistribution),
      switchMap(({ distributionId }) =>
        this.distributionService.deleteDistribution(distributionId).pipe(
          map(() => DistributionActions.deleteDistributionSuccess({ distributionId })),
          catchError(error => {
            console.error('Delete distribution failed:', error);
            return of(DistributionActions.deleteDistributionFailure({
              error: error.message || 'Erreur lors de la suppression'
            }));
          })
        )
      )
    )
  );

  // Sync Pending Distributions Effect - for future sync functionality
  syncPendingDistributions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.syncPendingDistributions),
      switchMap(() =>
        this.distributionService.getPendingDistributions().pipe(
          map(pendingDistributions => {
            // For now, just return success with count
            // Real sync will be implemented in sync US
            console.log(`Found ${pendingDistributions.length} pending distributions for sync`);
            return DistributionActions.syncPendingDistributionsSuccess({
              syncedCount: pendingDistributions.length
            });
          }),
          catchError(error => {
            console.error('Sync pending distributions failed:', error);
            return of(DistributionActions.syncPendingDistributionsFailure({
              error: error.message || 'Erreur lors de la synchronisation'
            }));
          })
        )
      )
    )
  );

  // Success Toast Effects
  createDistributionSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.createDistributionSuccess),
      withLatestFrom(this.store.select(selectAuthUser)),
      switchMap(([action, user]) => {
        const actions: Action[] = [
          ClientActions.updateClientCreditStatus({ clientId: action.distribution.clientId, creditInProgress: true }),
          ClientActions.loadClients({ commercialUsername: user?.username || '' })
        ];

        // Update local stock for each item in the distribution
        if (action.distribution.items) {
          action.distribution.items.forEach(item => {
            actions.push(CommercialStockActions.updateStockQuantity({
              articleId: item.articleId,
              quantityChange: -item.quantity
            }));
          });
        }

        return actions;
      })
    )
  );

  printReceiptSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.printReceiptSuccess),
      tap(async () => {
        const toast = await this.toastController.create({
          message: 'Reçu imprimé avec succès !',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

  syncSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.syncPendingDistributionsSuccess),
      tap(async ({ syncedCount }) => {
        if (syncedCount > 0) {
          const toast = await this.toastController.create({
            message: `${syncedCount} distribution(s) en attente de synchronisation`,
            duration: 3000,
            color: 'primary',
            position: 'top'
          });
          await toast.present();
        }
      })
    ),
    { dispatch: false }
  );

  /**
   * PROPOSITION MISE À JOUR :
   * Cet effet gère la mise à jour des montants d'une distribution.
   * Si le montant restant est <= 0, il distribue une seconde action
   * pour mettre à jour le statut de la distribution à 'SETTLED'.
   */
  updateDistributionAmounts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.updateDistributionAmounts),
      tap(() => console.log('[EFFECT] updateDistributionAmounts$: Triggered')),
      concatMap(({ distributionId, paidAmount, remainingAmount }) =>
        from(this.distributionService.updateDistributionAmounts(distributionId, paidAmount, remainingAmount)).pipe(
          mergeMap((updatedDistribution) => {
            const actions: Action[] = [
              DistributionActions.updateDistributionAmountsSuccess({ distribution: updatedDistribution })
            ];

            // **MODIFICATION CI-DESSOUS**
            // Ajout d'une garde pour vérifier que 'remainingAmount' est un nombre défini.
            if (typeof updatedDistribution.remainingAmount === 'number' && updatedDistribution.remainingAmount <= 0) {
              actions.push(DistributionActions.updateDistributionStatus({
                distributionId: updatedDistribution.id,
                status: 'SETTLED'
              }));
            }
            return actions;
          }),
          catchError(error => {
            console.error('Update distribution amounts failed:', error);
            return of(DistributionActions.updateDistributionAmountsFailure({
              error: error.message || 'Erreur lors de la mise à jour des montants'
            }));
          })
        )
      )
    )
  );

  // Error Toast Effects
  loadDistributionsError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.loadDistributionsFailure),
      tap(async ({ error }) => {
        const toast = await this.toastController.create({
          message: error,
          duration: 5000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

  loadArticlesError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.loadAvailableArticlesFailure),
      tap(async ({ error }) => {
        const toast = await this.toastController.create({
          message: error,
          duration: 5000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

  createDistributionError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.createDistributionFailure),
      tap(async ({ error }) => {
        const toast = await this.toastController.create({
          message: error,
          duration: 5000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

  printReceiptError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.printReceiptFailure),
      tap(async ({ error }) => {
        const toast = await this.toastController.create({
          message: error,
          duration: 5000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

  updateDistributionStatusError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.updateDistributionStatusFailure),
      tap(async ({ error }) => {
        const toast = await this.toastController.create({
          message: error,
          duration: 5000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

  deleteDistributionError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.deleteDistributionFailure),
      tap(async ({ error }) => {
        const toast = await this.toastController.create({
          message: error,
          duration: 5000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

  deleteDistributionsByClient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.deleteDistributionsByClient),
      switchMap(action => {
        return this.store.select(selectDistributionsByClientId(action.clientId)).pipe(
          take(1),
          switchMap(distributions => {
            const distributionIds = distributions.map(d => d.id);
            const actions: Action[] = [];

            distributions.forEach(dist => {
              if (dist.items) {
                dist.items.forEach(item => {
                  actions.push(ArticleActions.updateArticleStock({ articleId: item.articleId, quantity: item.quantity }));
                });
              }
            });

            if (distributionIds.length > 0) {
              actions.push(deleteRecoveriesByDistributionIds({ distributionIds }));
            }

            return from(this.distributionService.deleteDistributions(distributionIds)).pipe(
              map(() => DistributionActions.loadDistributions({ commercialUsername: '' })), // Reload distributions
              catchError(error => of(DistributionActions.deleteDistributionFailure({ error })))
            );
          })
        );
      })
    )
  );

  // Update Distribution Effect - save to local database only
  updateDistribution$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.updateDistribution),
      switchMap(({ distributionData }) =>
        this.distributionService.updateDistribution(distributionData).pipe(
          map(distribution => DistributionActions.updateDistributionSuccess({ distribution })),
          catchError(error => {
            console.error('Update distribution failed:', error);
            return of(DistributionActions.updateDistributionFailure({
              error: error.message || 'Erreur lors de la modification de la distribution'
            }));
          })
        )
      )
    )
  );

  // Update Distribution Success Effect
  updateDistributionSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.updateDistributionSuccess),
      withLatestFrom(this.store.select(selectAuthUser)),
      switchMap(([action, user]) => [
        DistributionActions.loadDistributions({ commercialUsername: user?.username || '' })
      ])
    )
  );

  // Update Distribution Error Effect
  updateDistributionError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DistributionActions.updateDistributionFailure),
      tap(async ({ error }) => {
        const toast = await this.toastController.create({
          message: error,
          duration: 5000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      })
    ),
    { dispatch: false }
  );

}
