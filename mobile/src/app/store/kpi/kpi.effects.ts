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
import { TontineCollectionRepositoryExtensions } from '../../core/repositories/tontine-collection.repository.extensions';
import { TontineDeliveryRepositoryExtensions } from '../../core/repositories/tontine-delivery.repository.extensions';
// import { AccountActivityRepositoryExtensions } from '../../core/repositories/account-activity.repository.extensions'; // Removed as it doesn't exist

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

  // ==================== CLIENT KPI EFFECTS ====================

  loadClientKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadClientKpi),
      switchMap(({ commercialUsername, dateFilter }) => {
        if (!commercialUsername) {
          return of(KpiActions.loadClientKpiFailure({
            error: 'commercialUsername is required for security'
          }));
        }

        return forkJoin({
          // Total clients (Portfolio) - No date filter
          totalByCommercial: from(this.clientRepoExt.countByCommercial(commercialUsername))
        }).pipe(
          map(({ totalByCommercial }) =>
            KpiActions.loadClientKpiSuccess({ total: totalByCommercial, totalByCommercial })
          ),
          catchError((error) =>
            of(KpiActions.loadClientKpiFailure({ error: error.message || 'Failed to load client KPI' }))
          )
        );
      })
    )
  );

  // ==================== RECOVERY KPI EFFECTS ====================

  loadRecoveryKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadRecoveryKpi),
      switchMap(({ commercialId, dateFilter }) => {
        if (!commercialId) {
          return of(KpiActions.loadRecoveryKpiFailure({
            error: 'commercialId is required for security'
          }));
        }

        // Calculate 'today' date filter
        const today = new Date().toISOString().split('T')[0];
        const todayFilter = { startDate: today, endDate: today };

        return forkJoin({
          // Total recoveries count (Period)
          totalByCommercial: this.recoveryRepoExt.countByCommercial(commercialId, { dateFilter }),
          // Today recoveries count
          today: this.recoveryRepoExt.countByCommercial(commercialId, { dateFilter: todayFilter }),
          // Total Amount (Period)
          totalAmountByCommercial: this.recoveryRepoExt.getTotalAmountByCommercial(commercialId, { dateFilter }),
          // Today Amount
          todayAmount: this.recoveryRepoExt.getTotalAmountByCommercial(commercialId, { dateFilter: todayFilter })
        }).pipe(
          map(({ totalByCommercial, today, totalAmountByCommercial, todayAmount }) =>
            KpiActions.loadRecoveryKpiSuccess({
              total: totalByCommercial,
              totalByCommercial,
              today,
              totalAmount: totalAmountByCommercial,
              totalAmountByCommercial,
              todayAmount
            })
          ),
          catchError((error) =>
            of(KpiActions.loadRecoveryKpiFailure({ error: error.message || 'Failed to load recovery KPI' }))
          )
        );
      })
    )
  );

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
          // Total Distributions (All Time Portfolio) - No date filter
          totalByCommercial: this.distributionRepoExt.countByCommercial(commercialId),
          // Active Distributions (All Time Active) - No date filter (status based)
          activeByCommercial: this.distributionRepoExt.countActiveByCommercial(commercialId),
          // Sales Amount (Production) - Period based (Date Filter)
          totalAmountByCommercial: this.distributionRepoExt.getTotalAmountByCommercial(commercialId, { dateFilter }),
          // Remaining Amount (Debt) - All Time (No date filter)
          totalRemaining: this.distributionRepoExt.getTotalRemainingAmountByCommercial(commercialId),
          // Daily Payment Expected - All Time Active (No date filter)
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

  // ==================== ARTICLE KPI EFFECTS ====================

  loadArticleKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadArticleKpi),
      switchMap(() =>
        from(this.getTotalArticles()).pipe(
          map(total => KpiActions.loadArticleKpiSuccess({ total })),
          catchError(error =>
            of(KpiActions.loadArticleKpiFailure({ error: error.message || 'Failed to load article KPI' }))
          )
        )
      )
    )
  );

  // ==================== ORDER KPI EFFECTS ====================

  loadOrderKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadOrderKpi),
      switchMap(({ commercialId, dateFilter }) => {
        if (!commercialId) {
          return of(KpiActions.loadOrderKpiFailure({
            error: 'commercialId is required for security'
          }));
        }

        // Orders count - Period based? Or All Time? Let's keep period for now as it's usually "Orders taken"
        return from(this.orderRepoExt.countByCommercial(commercialId, { dateFilter })).pipe(
          map(totalByCommercial =>
            KpiActions.loadOrderKpiSuccess({ total: totalByCommercial, totalByCommercial })
          ),
          catchError(error =>
            of(KpiActions.loadOrderKpiFailure({ error: error.message || 'Failed to load order KPI' }))
          )
        );
      })
    )
  );

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

  // ==================== TONTINE KPI EFFECTS ====================

  loadTontineKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadTontineKpi),
      switchMap(({ sessionId, commercialUsername }) => {
        if (!sessionId || !commercialUsername) {
          return of(KpiActions.loadTontineKpiFailure({ error: 'SessionID and CommercialUsername required' }));
        }

        return forkJoin({
          totalMembers: this.tontineRepoExt.countBySessionAndCommercial(sessionId, commercialUsername),
          totalCollected: this.tontineRepoExt.getTotalCollectedBySessionAndCommercial(sessionId, commercialUsername),
          pendingDeliveries: this.tontineRepoExt.countPendingDeliveriesBySessionAndCommercial(sessionId, commercialUsername)
        }).pipe(
          map(stats => KpiActions.loadTontineKpiSuccess({
            totalMembers: stats.totalMembers,
            totalMembersBySession: stats.totalMembers,
            pendingDeliveries: stats.pendingDeliveries,
            totalCollected: stats.totalCollected
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
          dailyCollectionsCount: this.tontineCollectionRepoExt.countByCommercial(commercialUsername, { dateFilter }),
          dailyCollectionsAmount: this.tontineCollectionRepoExt.getTotalCollectionAmountByCommercial(commercialUsername, { dateFilter }),
          dailyDeliveriesCount: this.tontineDeliveryRepoExt.countByCommercial(commercialUsername, { dateFilter }),
          dailyDeliveriesAmount: this.tontineDeliveryRepoExt.getTotalAmountByCommercial(commercialUsername, { dateFilter })
        }).pipe(
          map(stats => KpiActions.loadTontineSummaryKpiSuccess({
            dailyMembersCount: stats.dailyMembersCount,
            dailyCollectionsCount: stats.dailyCollectionsCount,
            dailyCollectionsAmount: stats.dailyCollectionsAmount,
            dailyDeliveriesCount: stats.dailyDeliveriesCount,
            dailyDeliveriesAmount: stats.dailyDeliveriesAmount
          })),
          catchError(error => of(KpiActions.loadTontineSummaryKpiFailure({ error: error.message })))
        )
      )
    )
  );

  // ==================== ACCOUNT ACTIVITY KPI EFFECTS ====================

  loadAccountActivityKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadAccountActivityKpi),
      switchMap(({ commercialUsername, dateFilter }) => {
        // Use ClientRepositoryExtensions to get account activity
        return from(this.clientRepoExt.getAccountActivityByCommercial(commercialUsername, dateFilter)).pipe(
          map(stats => KpiActions.loadAccountActivityKpiSuccess({
            newClientsCount: stats.newClientsCount,
            newAccountsCount: stats.newAccountsCount,
            newAccountsBalance: stats.newAccountsBalance,
            updatedAccountsCount: stats.updatedAccountsCount,
            updatedAccountsBalance: stats.updatedAccountsBalance
          })),
          catchError(error => of(KpiActions.loadAccountActivityKpiFailure({ error: error.message })))
        );
      })
    )
  );

  // ==================== ADVANCES KPI EFFECTS ====================

  loadAdvancesKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadAdvancesKpi),
      switchMap(({ commercialId, dateFilter }) =>
        from(this.distributionRepoExt.getTotalAdvancesByCommercial(commercialId, dateFilter)).pipe(
          map(stats => KpiActions.loadAdvancesKpiSuccess({
            count: stats.count,
            totalAmount: stats.totalAmount
          })),
          catchError(error => of(KpiActions.loadAdvancesKpiFailure({ error: error.message })))
        )
      )
    )
  );

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

        return from(actions);
      })
    ),
    { dispatch: true } // Ensure actions are dispatched
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
