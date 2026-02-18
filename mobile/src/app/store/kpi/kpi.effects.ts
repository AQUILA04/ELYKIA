import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as KpiActions from './kpi.actions';
import { ClientRepositoryExtensions } from '../../core/repositories/client.repository.extensions';
import { RecoveryRepositoryExtensions } from '../../core/repositories/recovery.repository.extensions';
import { DistributionRepositoryExtensions } from '../../core/repositories/distribution.repository.extensions';
import { OrderRepositoryExtensions } from '../../core/repositories/order.repository.extensions';
import { TontineMemberRepositoryExtensions } from '../../core/repositories/tontine-member.repository.extensions';
import { ArticleRepository } from '../../core/repositories/article.repository';

/**
 * KPI Effects
 * 
 * These effects handle loading KPIs from the database using direct SQL queries
 * via repository extensions. All KPIs are calculated server-side (SQLite) and
 * are completely independent of list data stored in other stores.
 * 
 * **SECURITY**: All KPI calculations enforce commercial-level data isolation.
 * The commercialId/commercialUsername parameter is REQUIRED for all operations.
 */
@Injectable()
export class KpiEffects {
  constructor(
    private actions$: Actions,
    private clientRepoExt: ClientRepositoryExtensions,
    private recoveryRepoExt: RecoveryRepositoryExtensions,
    private distributionRepoExt: DistributionRepositoryExtensions,
    private orderRepoExt: OrderRepositoryExtensions,
    private tontineRepoExt: TontineMemberRepositoryExtensions,
    private articleRepo: ArticleRepository
  ) {}

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
          totalByCommercial: this.clientRepoExt.countByCommercial(commercialUsername, { dateFilter })
        }).pipe(
          map(({ totalByCommercial }) =>
            KpiActions.loadClientKpiSuccess({ 
              total: totalByCommercial,  // For consistency, total = totalByCommercial
              totalByCommercial 
            })
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

        return forkJoin({
          totalByCommercial: this.recoveryRepoExt.countByCommercial(commercialId, { dateFilter }),
          totalAmountByCommercial: this.recoveryRepoExt.getTotalAmountByCommercial(commercialId, { dateFilter })
        }).pipe(
          map(({ totalByCommercial, totalAmountByCommercial }) =>
            KpiActions.loadRecoveryKpiSuccess({ 
              total: totalByCommercial,  // For consistency
              totalByCommercial, 
              today: 0,  // Deprecated - use dateFilter instead
              totalAmount: totalAmountByCommercial,  // For consistency
              totalAmountByCommercial,
              todayAmount: 0  // Deprecated - use dateFilter instead
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
          totalByCommercial: this.distributionRepoExt.countByCommercial(commercialId, { dateFilter }),
          activeByCommercial: this.distributionRepoExt.countActiveByCommercial(commercialId, dateFilter),
          totalAmountByCommercial: this.distributionRepoExt.getTotalAmountByCommercial(commercialId, { dateFilter })
        }).pipe(
          map(({ totalByCommercial, activeByCommercial, totalAmountByCommercial }) =>
            KpiActions.loadDistributionKpiSuccess({ 
              total: totalByCommercial,  // For consistency
              totalByCommercial, 
              active: activeByCommercial,  // For consistency
              activeByCommercial,
              totalAmount: totalAmountByCommercial,  // For consistency
              totalAmountByCommercial
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
        this.getTotalArticles().pipe(
          map((total) => KpiActions.loadArticleKpiSuccess({ total })),
          catchError((error) =>
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
      switchMap(({ commercialId }) => {
        if (!commercialId) {
          return of(KpiActions.loadOrderKpiFailure({ 
            error: 'commercialId is required for security' 
          }));
        }

        return forkJoin({
          totalByCommercial: this.orderRepoExt.countByCommercial(commercialId)
        }).pipe(
          map(({ totalByCommercial }) =>
            KpiActions.loadOrderKpiSuccess({ 
              total: totalByCommercial,  // For consistency
              totalByCommercial 
            })
          ),
          catchError((error) =>
            of(KpiActions.loadOrderKpiFailure({ error: error.message || 'Failed to load order KPI' }))
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
          return of(KpiActions.loadTontineKpiFailure({ 
            error: 'sessionId and commercialUsername are required for security' 
          }));
        }

        return forkJoin({
          totalMembersBySession: this.tontineRepoExt.countBySessionAndCommercial(sessionId, commercialUsername),
          pendingDeliveries: this.tontineRepoExt.countPendingDeliveriesBySessionAndCommercial(sessionId, commercialUsername),
          totalCollected: this.tontineRepoExt.getTotalCollectedBySessionAndCommercial(sessionId, commercialUsername)
        }).pipe(
          map(({ totalMembersBySession, pendingDeliveries, totalCollected }) =>
            KpiActions.loadTontineKpiSuccess({ 
              totalMembers: totalMembersBySession,  // For consistency
              totalMembersBySession, 
              pendingDeliveries, 
              totalCollected 
            })
          ),
          catchError((error) =>
            of(KpiActions.loadTontineKpiFailure({ error: error.message || 'Failed to load tontine KPI' }))
          )
        );
      })
    )
  );

  // ==================== COMBINED EFFECTS ====================

  loadAllKpi$ = createEffect(() =>
    this.actions$.pipe(
      ofType(KpiActions.loadAllKpi),
      switchMap(({ commercialUsername, commercialId, sessionId }) => {
        // Validate required parameters
        if (!commercialUsername || !commercialId) {
          console.error('loadAllKpi requires commercialUsername and commercialId for security');
          return of(); // Return empty observable to prevent errors
        }

        return [
          KpiActions.loadClientKpi({ commercialUsername }),
          KpiActions.loadRecoveryKpi({ commercialId }),
          KpiActions.loadDistributionKpi({ commercialId }),
          KpiActions.loadArticleKpi(),
          KpiActions.loadOrderKpi({ commercialId }),
          // Only load tontine KPI if sessionId is provided
          ...(sessionId ? [KpiActions.loadTontineKpi({ sessionId, commercialUsername })] : [])
        ];
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
