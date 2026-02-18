import { createFeatureSelector, createSelector } from '@ngrx/store';
import { KpiState } from './kpi.reducer';

/**
 * KPI Selectors
 * 
 * These selectors provide access to KPI data from the store.
 * Components should use these selectors instead of calculating KPIs
 * from list data.
 */

// Feature selector
export const selectKpiState = createFeatureSelector<KpiState>('kpi');

// ==================== CLIENT KPI SELECTORS ====================

export const selectClientKpi = createSelector(
  selectKpiState,
  (state: KpiState) => state.clientKpi
);

export const selectClientKpiTotal = createSelector(
  selectClientKpi,
  (clientKpi) => clientKpi.total
);

export const selectClientKpiTotalByCommercial = createSelector(
  selectClientKpi,
  (clientKpi) => clientKpi.totalByCommercial
);

export const selectClientKpiLoading = createSelector(
  selectClientKpi,
  (clientKpi) => clientKpi.loading
);

// ==================== RECOVERY KPI SELECTORS ====================

export const selectRecoveryKpi = createSelector(
  selectKpiState,
  (state: KpiState) => state.recoveryKpi
);

export const selectRecoveryKpiTotal = createSelector(
  selectRecoveryKpi,
  (recoveryKpi) => recoveryKpi.total
);

export const selectRecoveryKpiTotalByCommercial = createSelector(
  selectRecoveryKpi,
  (recoveryKpi) => recoveryKpi.totalByCommercial
);

export const selectRecoveryKpiToday = createSelector(
  selectRecoveryKpi,
  (recoveryKpi) => recoveryKpi.today
);

export const selectRecoveryKpiTotalAmount = createSelector(
  selectRecoveryKpi,
  (recoveryKpi) => recoveryKpi.totalAmount
);

export const selectRecoveryKpiTotalAmountByCommercial = createSelector(
  selectRecoveryKpi,
  (recoveryKpi) => recoveryKpi.totalAmountByCommercial
);

export const selectRecoveryKpiTodayAmount = createSelector(
  selectRecoveryKpi,
  (recoveryKpi) => recoveryKpi.todayAmount
);

export const selectRecoveryKpiLoading = createSelector(
  selectRecoveryKpi,
  (recoveryKpi) => recoveryKpi.loading
);

/**
 * Selector for recovery list component stats
 * Returns all stats needed for the recovery list header
 */
export const selectRecoveryListStats = createSelector(
  selectRecoveryKpi,
  (recoveryKpi) => ({
    total: recoveryKpi.totalByCommercial,
    today: recoveryKpi.today,
    totalAmount: recoveryKpi.totalAmountByCommercial
  })
);

// ==================== DISTRIBUTION KPI SELECTORS ====================

export const selectDistributionKpi = createSelector(
  selectKpiState,
  (state: KpiState) => state.distributionKpi
);

export const selectDistributionKpiTotal = createSelector(
  selectDistributionKpi,
  (distributionKpi) => distributionKpi.total
);

export const selectDistributionKpiTotalByCommercial = createSelector(
  selectDistributionKpi,
  (distributionKpi) => distributionKpi.totalByCommercial
);

export const selectDistributionKpiActive = createSelector(
  selectDistributionKpi,
  (distributionKpi) => distributionKpi.active
);

export const selectDistributionKpiActiveByCommercial = createSelector(
  selectDistributionKpi,
  (distributionKpi) => distributionKpi.activeByCommercial
);

export const selectDistributionKpiTotalAmount = createSelector(
  selectDistributionKpi,
  (distributionKpi) => distributionKpi.totalAmount
);

export const selectDistributionKpiTotalAmountByCommercial = createSelector(
  selectDistributionKpi,
  (distributionKpi) => distributionKpi.totalAmountByCommercial
);

export const selectDistributionKpiDailyPayment = createSelector(
  selectDistributionKpi,
  (distributionKpi) => distributionKpi.dailyPayment
);

export const selectDistributionKpiTotalRemaining = createSelector(
  selectDistributionKpi,
  (distributionKpi) => distributionKpi.totalRemaining
);

export const selectDistributionKpiLoading = createSelector(
  selectDistributionKpi,
  (distributionKpi) => distributionKpi.loading
);

export const selectDistributionListStats = createSelector(
  selectDistributionKpi,
  (distributionKpi) => ({
    total: distributionKpi.totalByCommercial,
    active: distributionKpi.activeByCommercial,
    totalAmount: distributionKpi.totalAmountByCommercial
  })
);

// ==================== ARTICLE KPI SELECTORS ====================

export const selectArticleKpi = createSelector(
  selectKpiState,
  (state: KpiState) => state.articleKpi
);

export const selectArticleKpiTotal = createSelector(
  selectArticleKpi,
  (articleKpi) => articleKpi.total
);

export const selectArticleKpiLoading = createSelector(
  selectArticleKpi,
  (articleKpi) => articleKpi.loading
);

// ==================== ORDER KPI SELECTORS ====================

export const selectOrderKpi = createSelector(
  selectKpiState,
  (state: KpiState) => state.orderKpi
);

export const selectOrderKpiTotal = createSelector(
  selectOrderKpi,
  (orderKpi) => orderKpi.total
);

export const selectOrderKpiTotalByCommercial = createSelector(
  selectOrderKpi,
  (orderKpi) => orderKpi.totalByCommercial
);

export const selectOrderKpiLoading = createSelector(
  selectOrderKpi,
  (orderKpi) => orderKpi.loading
);

// ==================== COMMERCIAL STOCK KPI SELECTORS ====================

export const selectCommercialStockKpi = createSelector(
  selectKpiState,
  (state: KpiState) => state.commercialStockKpi
);

export const selectCommercialStockKpiTotalValue = createSelector(
  selectCommercialStockKpi,
  (kpi) => kpi.totalValue
);

export const selectCommercialStockKpiLoading = createSelector(
  selectCommercialStockKpi,
  (kpi) => kpi.loading
);

// ==================== TONTINE KPI SELECTORS ====================

export const selectTontineKpi = createSelector(
  selectKpiState,
  (state: KpiState) => state.tontineKpi
);

export const selectTontineKpiTotalMembers = createSelector(
  selectTontineKpi,
  (tontineKpi) => tontineKpi.totalMembers
);

export const selectTontineKpiTotalMembersBySession = createSelector(
  selectTontineKpi,
  (tontineKpi) => tontineKpi.totalMembersBySession
);

export const selectTontineKpiPendingDeliveries = createSelector(
  selectTontineKpi,
  (tontineKpi) => tontineKpi.pendingDeliveries
);

export const selectTontineKpiTotalCollected = createSelector(
  selectTontineKpi,
  (tontineKpi) => tontineKpi.totalCollected
);

export const selectTontineKpiLoading = createSelector(
  selectTontineKpi,
  (tontineKpi) => tontineKpi.loading
);

/**
 * Selector for tontine dashboard stats
 * Returns all stats needed for the tontine dashboard
 */
export const selectTontineDashboardStats = createSelector(
  selectTontineKpi,
  (tontineKpi) => ({
    totalMembers: tontineKpi.totalMembersBySession,
    pendingDeliveries: tontineKpi.pendingDeliveries,
    totalCollected: tontineKpi.totalCollected
  })
);

// ==================== COMBINED SELECTORS ====================

/**
 * Selector for dashboard page
 * Returns all KPIs needed for the main dashboard
 */
export const selectDashboardKpis = createSelector(
  selectClientKpi,
  selectRecoveryKpi,
  selectDistributionKpi,
  selectArticleKpi,
  selectCommercialStockKpi,
  selectTontineKpi,
  (clientKpi, recoveryKpi, distributionKpi, articleKpi, commercialStockKpi, tontineKpi) => ({
    clients: {
      total: clientKpi.totalByCommercial,
      loading: clientKpi.loading
    },
    recoveries: {
      total: recoveryKpi.totalByCommercial,
      today: recoveryKpi.today,
      totalAmount: recoveryKpi.totalAmountByCommercial,
      todayAmount: recoveryKpi.todayAmount,
      loading: recoveryKpi.loading
    },
    distributions: {
      total: distributionKpi.totalByCommercial,
      active: distributionKpi.activeByCommercial,
      totalAmount: distributionKpi.totalAmountByCommercial,
      dailyPayment: distributionKpi.dailyPayment,
      loading: distributionKpi.loading
    },
    articles: {
      total: articleKpi.total,
      loading: articleKpi.loading
    },
    commercialStock: {
      totalValue: commercialStockKpi.totalValue,
      loading: commercialStockKpi.loading
    },
    tontine: {
      totalCollected: tontineKpi.totalCollected,
      loading: tontineKpi.loading
    }
  })
);

/**
 * Selector to check if any KPI is loading
 */
export const selectAnyKpiLoading = createSelector(
  selectClientKpiLoading,
  selectRecoveryKpiLoading,
  selectDistributionKpiLoading,
  selectArticleKpiLoading,
  selectOrderKpiLoading,
  selectTontineKpiLoading,
  selectCommercialStockKpiLoading,
  (clientLoading, recoveryLoading, distributionLoading, articleLoading, orderLoading, tontineLoading, stockLoading) =>
    clientLoading || recoveryLoading || distributionLoading || articleLoading || orderLoading || tontineLoading || stockLoading
);
