import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, forkJoin, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as KpiActions from './kpi.actions';
import { ClientRepositoryExtensions } from '../../core/repositories/client.repository.extensions';
import { RecoveryRepositoryExtensions } from '../../core/repositories/recovery.repository.extensions';
import { DistributionRepositoryExtensions } from '../../core/repositories/distribution.repository.extensions';
import { OrderRepositoryExtensions } from '../../core/repositories/order.repository.extensions';
import { TontineMemberRepositoryExtensions } from '../../core/repositories/tontine-member.repository.extensions';
import { ArticleRepository } from '../../core/repositories/article.repository';
import { CommercialStockRepository } from '../../core/repositories/commercial-stock.repository';

// ... (imports remain the same)

import { TontineCollectionRepositoryExtensions } from '../../core/repositories/tontine-collection.repository.extensions';
import { TontineDeliveryRepositoryExtensions } from '../../core/repositories/tontine-delivery.repository.extensions';

// ... (imports)

@Injectable()
export class KpiEffects {
  constructor(
    private actions$: Actions,
    private clientRepoExt: ClientRepositoryExtensions,
    private recoveryRepoExt: RecoveryRepositoryExtensions,
    private distributionRepoExt: DistributionRepositoryExtensions,
    private orderRepoExt: OrderRepositoryExtensions,
    private tontineRepoExt: TontineMemberRepositoryExtensions,
    private tontineCollectionRepoExt: TontineCollectionRepositoryExtensions,
    private tontineDeliveryRepoExt: TontineDeliveryRepositoryExtensions,
    private articleRepo: ArticleRepository,
    private commercialStockRepo: CommercialStockRepository
  ) { }

  // ... (client and recovery effects remain the same)

  // ==================== DISTRIBUTION KPI EFFECTS ====================

  loadDistributionKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadDistributionKpi),
      switchMap(({ commercialId, dateFilter }) => {
        if (!commercialId) {
          return of(KpiActions.loadDistributionKpiFailure({
            error: 'commercialId is required for security'
          }));
        }

        return forkJoin({
          totalByCommercial: this.distributionRepoExt.countByCommercial(commercialId, { dateFilter }),
          activeByCommercial: this.distributionRepoExt.countActiveByCommercial(commercialId, dateFilter),
          totalAmountByCommercial: this.distributionRepoExt.getTotalAmountByCommercial(commercialId, { dateFilter }),
          totalRemaining: this.distributionRepoExt.getTotalRemainingAmountByCommercial(commercialId, { dateFilter }),
          dailyPayment: this.distributionRepoExt.getTotalDailyPaymentAmountByCommercial(commercialId)
        }).pipe(
          map(({ totalByCommercial, activeByCommercial, totalAmountByCommercial, totalRemaining, dailyPayment }) =>
            KpiActions.loadDistributionKpiSuccess({
              total: totalByCommercial,
              totalByCommercial,
              active: activeByCommercial,
              activeByCommercial,
              totalAmount: totalAmountByCommercial,
              totalAmountByCommercial,
              totalRemaining,
              dailyPayment
            })
          ),
          catchError((error) =>
            of(KpiActions.loadDistributionKpiFailure({ error: error.message || 'Failed to load distribution KPI' }))
          )
        );
      })
    )
  );

  // ... (article and order effects remain the same)

  // ==================== COMMERCIAL STOCK KPI EFFECTS ====================

  loadCommercialStockKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadCommercialStockKpi),
      switchMap(({ commercialUsername }) => {
        if (!commercialUsername) {
          return of(KpiActions.loadCommercialStockKpiFailure({
            error: 'commercialUsername is required for security'
          }));
        }

        return from(this.commercialStockRepo.getTotalStockValue(commercialUsername)).pipe(
          map(totalValue =>
            KpiActions.loadCommercialStockKpiSuccess({ totalValue })
          ),
          catchError(error =>
            of(KpiActions.loadCommercialStockKpiFailure({ error: error.message || 'Failed to load commercial stock KPI' }))
          )
        );
      })
    )
  );

  // ... (tontine effects remain the same)

  // ==================== COMBINED EFFECTS ====================

  loadTontineKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadTontineKpi),
      switchMap(({ sessionId, commercialUsername }) => {
        if (!sessionId || !commercialUsername) {
          // If no session ID, we might skip or return empty.
          // Existing logic checks sessionId in loadAllKpi.
          return of(KpiActions.loadTontineKpiFailure({ error: 'SessionID and CommercialUsername required' }));
        }

        return forkJoin({
          totalMembers: this.tontineRepoExt.countBySessionAndCommercial(sessionId, commercialUsername),
          totalCollected: this.tontineRepoExt.getTotalCollectedBySessionAndCommercial(sessionId, commercialUsername),
          pendingDeliveries: this.tontineRepoExt.countPendingDeliveriesBySessionAndCommercial(sessionId, commercialUsername)
        }).pipe(
          map(stats => KpiActions.loadTontineKpiSuccess({
            ...stats,
            totalMembersBySession: stats.totalMembers // Mapping overlap?
          })),
          catchError(error => of(KpiActions.loadTontineKpiFailure({ error: error.message })))
        );
      })
    )
  );

  loadTontineSummaryKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadTontineSummaryKpi),
      switchMap(({ commercialUsername, dateFilter }) =>
        forkJoin({
          dailyMembersCount: this.tontineRepoExt.countByCommercial(commercialUsername, { dateFilter }),
          dailyCollectionsAmount: this.tontineCollectionRepoExt.getTotalCollectionAmountByCommercial(commercialUsername, { dateFilter }),
          dailyDeliveriesAmount: this.tontineDeliveryRepoExt.getTotalAmountByCommercial(commercialUsername, { dateFilter })
        }).pipe(
          map(stats => KpiActions.loadTontineSummaryKpiSuccess({
            dailyMembersCount: stats.dailyMembersCount,
            dailyCollectionsAmount: stats.dailyCollectionsAmount,
            dailyDeliveriesAmount: stats.dailyDeliveriesAmount
          })),
          catchError(error => of(KpiActions.loadTontineSummaryKpiFailure({ error: error.message })))
        )
      )
    )
  );

  // Implemented below with replace_file_content separately to handle constructor injection

  // ==================== COMBINED EFFECTS ====================

  loadAllKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadAllKpi),
      switchMap(({ commercialUsername, commercialId, sessionId, dateFilter }) => {
        // Validate required parameters
        if (!commercialUsername || !commercialId) {
          console.error('loadAllKpi requires commercialUsername and commercialId for security');
          return of(); // Return empty observable to prevent errors
        }

        const actions: any[] = [
          KpiActions.loadClientKpi({ commercialUsername: commercialUsername!, dateFilter }),
          KpiActions.loadRecoveryKpi({ commercialId: commercialId!, dateFilter }),
          KpiActions.loadDistributionKpi({ commercialId: commercialId!, dateFilter }),
          KpiActions.loadArticleKpi(),
          KpiActions.loadOrderKpi({ commercialId: commercialId!, dateFilter }),
          KpiActions.loadCommercialStockKpi({ commercialUsername: commercialUsername! }),

          // New Actions
          KpiActions.loadAccountActivityKpi({ commercialUsername: commercialUsername!, dateFilter }),
          KpiActions.loadAdvancesKpi({ commercialId: commercialId!, dateFilter }),
          KpiActions.loadTontineSummaryKpi({ commercialUsername: commercialUsername!, dateFilter })
        ];

        if (sessionId) {
          actions.push(KpiActions.loadTontineKpi({ sessionId, commercialUsername, dateFilter }));
        }

        return actions;
      })
    )
  );

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Get total articles (global data, no commercial filter)
   * Articles are shared across all commercials
   */
  private getTotalArticles() {
    return new Promise<number>((resolve, reject) => {
      this.articleRepo['getDatabaseService']()
        .query('SELECT COUNT(*) as total FROM articles')
        .then(result => resolve(result.values?.[0]?.total || 0))
        .catch(reject);
    });
  }
}
