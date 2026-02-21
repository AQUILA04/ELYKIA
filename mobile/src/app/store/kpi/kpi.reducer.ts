import { createReducer, on } from '@ngrx/store';
import * as KpiActions from './kpi.actions';

/**
 * KPI State Interface
 * 
 * This state holds all Key Performance Indicators (KPIs) for the application.
 * All KPIs are calculated via direct SQL queries and are completely decoupled
 * from the list data stored in other stores.
 */
export interface KpiState {
  // Client KPIs
  clientKpi: {
    total: number;
    totalByCommercial: number;
    loading: boolean;
    error: string | null;
  };

  // Recovery KPIs
  recoveryKpi: {
    total: number;
    totalByCommercial: number;
    today: number;
    totalAmount: number;
    totalAmountByCommercial: number;
    todayAmount: number;
    loading: boolean;
    error: string | null;
  };

  // Distribution KPIs
  distributionKpi: {
    total: number;
    totalByCommercial: number;
    active: number;
    activeByCommercial: number;
    totalAmount: number;
    totalAmountByCommercial: number;
    totalRemaining: number;
    dailyPayment: number;
    loading: boolean;
    error: string | null;
  };

  // Article KPIs
  articleKpi: {
    total: number;
    loading: boolean;
    error: string | null;
  };

  // Order KPIs
  orderKpi: {
    total: number;
    totalByCommercial: number;
    loading: boolean;
    error: string | null;
  };

  // Commercial Stock KPIs
  commercialStockKpi: {
    totalValue: number;
    loading: boolean;
    error: string | null;
  };

  // Account Activity KPIs (New/Updated Accounts)
  accountActivityKpi: {
    newClientsCount: number;
    newAccountsCount: number;
    newAccountsBalance: number;
    updatedAccountsCount: number;
    updatedAccountsBalance: number;
    loading: boolean;
    error: string | null;
  };

  // Advances KPIs
  advancesKpi: {
    count: number;
    totalAmount: number;
    loading: boolean;
    error: string | null;
  };

  // Tontine KPIs
  tontineKpi: {
    totalMembers: number; // For session
    totalMembersBySession: number; // For session
    pendingDeliveries: number; // For session
    totalCollected: number; // For session

    // Global/Daily Tontine Stats
    dailyMembersCount: number;
    dailyCollectionsCount: number;
    dailyCollectionsAmount: number;
    dailyDeliveriesCount: number;
    dailyDeliveriesAmount: number;

    loading: boolean;
    error: string | null;
  };
}

export const initialState: KpiState = {
  clientKpi: {
    total: 0,
    totalByCommercial: 0,
    loading: false,
    error: null
  },
  recoveryKpi: {
    total: 0,
    totalByCommercial: 0,
    today: 0,
    totalAmount: 0,
    totalAmountByCommercial: 0,
    todayAmount: 0,
    loading: false,
    error: null
  },
  distributionKpi: {
    total: 0,
    totalByCommercial: 0,
    active: 0,
    activeByCommercial: 0,
    totalAmount: 0,
    totalAmountByCommercial: 0,
    totalRemaining: 0,
    dailyPayment: 0,
    loading: false,
    error: null
  },
  articleKpi: {
    total: 0,
    loading: false,
    error: null
  },
  orderKpi: {
    total: 0,
    totalByCommercial: 0,
    loading: false,
    error: null
  },
  commercialStockKpi: {
    totalValue: 0,
    loading: false,
    error: null
  },
  accountActivityKpi: {
    newClientsCount: 0,
    newAccountsCount: 0,
    newAccountsBalance: 0,
    updatedAccountsCount: 0,
    updatedAccountsBalance: 0,
    loading: false,
    error: null
  },
  advancesKpi: {
    count: 0,
    totalAmount: 0,
    loading: false,
    error: null
  },
  tontineKpi: {
    totalMembers: 0,
    totalMembersBySession: 0,
    pendingDeliveries: 0,
    totalCollected: 0,

    dailyMembersCount: 0,
    dailyCollectionsCount: 0,
    dailyCollectionsAmount: 0,
    dailyDeliveriesCount: 0,
    dailyDeliveriesAmount: 0,

    loading: false,
    error: null
  }
};

export const kpiReducer = createReducer(
  initialState,

  // ==================== CLIENT KPI ====================
  on(KpiActions.loadClientKpi, (state) => ({
    ...state,
    clientKpi: {
      ...state.clientKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadClientKpiSuccess, (state, { total, totalByCommercial }) => ({
    ...state,
    clientKpi: {
      total,
      totalByCommercial,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadClientKpiFailure, (state, { error }) => ({
    ...state,
    clientKpi: {
      ...state.clientKpi,
      loading: false,
      error
    }
  })),

  // ==================== RECOVERY KPI ====================
  on(KpiActions.loadRecoveryKpi, (state) => ({
    ...state,
    recoveryKpi: {
      ...state.recoveryKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadRecoveryKpiSuccess, (state, { total, totalByCommercial, today, totalAmount, totalAmountByCommercial, todayAmount }) => ({
    ...state,
    recoveryKpi: {
      total,
      totalByCommercial,
      today,
      totalAmount,
      totalAmountByCommercial,
      todayAmount,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadRecoveryKpiFailure, (state, { error }) => ({
    ...state,
    recoveryKpi: {
      ...state.recoveryKpi,
      loading: false,
      error
    }
  })),

  // ==================== DISTRIBUTION KPI ====================
  on(KpiActions.loadDistributionKpi, (state) => ({
    ...state,
    distributionKpi: {
      ...state.distributionKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadDistributionKpiSuccess, (state, { total, totalByCommercial, active, activeByCommercial, totalAmount, totalAmountByCommercial, totalRemaining, dailyPayment }) => ({
    ...state,
    distributionKpi: {
      total,
      totalByCommercial,
      active,
      activeByCommercial,
      totalAmount,
      totalAmountByCommercial,
      totalRemaining,
      dailyPayment,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadDistributionKpiFailure, (state, { error }) => ({
    ...state,
    distributionKpi: {
      ...state.distributionKpi,
      loading: false,
      error
    }
  })),

  // ==================== ARTICLE KPI ====================
  on(KpiActions.loadArticleKpi, (state) => ({
    ...state,
    articleKpi: {
      ...state.articleKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadArticleKpiSuccess, (state, { total }) => ({
    ...state,
    articleKpi: {
      total,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadArticleKpiFailure, (state, { error }) => ({
    ...state,
    articleKpi: {
      ...state.articleKpi,
      loading: false,
      error
    }
  })),

  // ==================== ORDER KPI ====================
  on(KpiActions.loadOrderKpi, (state) => ({
    ...state,
    orderKpi: {
      ...state.orderKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadOrderKpiSuccess, (state, { total, totalByCommercial }) => ({
    ...state,
    orderKpi: {
      total,
      totalByCommercial,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadOrderKpiFailure, (state, { error }) => ({
    ...state,
    orderKpi: {
      ...state.orderKpi,
      loading: false,
      error
    }
  })),

  // ==================== COMMERCIAL STOCK KPI ====================
  on(KpiActions.loadCommercialStockKpi, (state) => ({
    ...state,
    commercialStockKpi: {
      ...state.commercialStockKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadCommercialStockKpiSuccess, (state, { totalValue }) => ({
    ...state,
    commercialStockKpi: {
      totalValue,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadCommercialStockKpiFailure, (state, { error }) => ({
    ...state,
    commercialStockKpi: {
      ...state.commercialStockKpi,
      loading: false,
      error
    }
  })),

  // ==================== TONTINE KPI ====================
  on(KpiActions.loadTontineKpi, (state) => ({
    ...state,
    tontineKpi: {
      ...state.tontineKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadTontineKpiSuccess, (state, { totalMembers, totalMembersBySession, pendingDeliveries, totalCollected }) => ({
    ...state,
    tontineKpi: {
      ...state.tontineKpi,
      totalMembers,
      totalMembersBySession,
      pendingDeliveries,
      totalCollected,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadTontineKpiFailure, (state, { error }) => ({
    ...state,
    tontineKpi: {
      ...state.tontineKpi,
      loading: false,
      error
    }
  })),

  // ==================== ACCOUNT ACTIVITY KPI ====================
  on(KpiActions.loadAccountActivityKpi, (state) => ({
    ...state,
    accountActivityKpi: {
      ...state.accountActivityKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadAccountActivityKpiSuccess, (state, { newClientsCount, newAccountsCount, newAccountsBalance, updatedAccountsCount, updatedAccountsBalance }) => ({
    ...state,
    accountActivityKpi: {
      newClientsCount,
      newAccountsCount,
      newAccountsBalance,
      updatedAccountsCount,
      updatedAccountsBalance,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadAccountActivityKpiFailure, (state, { error }) => ({
    ...state,
    accountActivityKpi: {
      ...state.accountActivityKpi,
      loading: false,
      error
    }
  })),

  // ==================== ADVANCES KPI ====================
  on(KpiActions.loadAdvancesKpi, (state) => ({
    ...state,
    advancesKpi: {
      ...state.advancesKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadAdvancesKpiSuccess, (state, { count, totalAmount }) => ({
    ...state,
    advancesKpi: {
      count,
      totalAmount,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadAdvancesKpiFailure, (state, { error }) => ({
    ...state,
    advancesKpi: {
      ...state.advancesKpi,
      loading: false,
      error
    }
  })),

  // ==================== TONTINE SUMMARY KPI ====================
  on(KpiActions.loadTontineSummaryKpi, (state) => ({
    ...state,
    tontineKpi: {
      ...state.tontineKpi,
      loading: true,
      error: null
    }
  })),
  on(KpiActions.loadTontineSummaryKpiSuccess, (state, { dailyMembersCount, dailyCollectionsCount, dailyCollectionsAmount, dailyDeliveriesCount, dailyDeliveriesAmount }) => ({
    ...state,
    tontineKpi: {
      ...state.tontineKpi,
      dailyMembersCount,
      dailyCollectionsCount,
      dailyCollectionsAmount,
      dailyDeliveriesCount,
      dailyDeliveriesAmount,
      loading: false,
      error: null
    }
  })),
  on(KpiActions.loadTontineSummaryKpiFailure, (state, { error }) => ({
    ...state,
    tontineKpi: {
      ...state.tontineKpi,
      loading: false,
      error
    }
  }))
);
