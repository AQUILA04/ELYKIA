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

@Injectable()
export class KpiEffects {
  constructor(
    private actions$: Actions,
    private clientRepoExt: ClientRepositoryExtensions,
    private recoveryRepoExt: RecoveryRepositoryExtensions,
    private distributionRepoExt: DistributionRepositoryExtensions,
    private orderRepoExt: OrderRepositoryExtensions,
    private tontineRepoExt: TontineMemberRepositoryExtensions,
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
          KpiActions.loadCommercialStockKpi({ commercialUsername }),
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
