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

  // Tontine KPIs
  tontineKpi: {
    totalMembers: number;
    totalMembersBySession: number;
    pendingDeliveries: number;
    totalCollected: number;
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
  tontineKpi: {
    totalMembers: 0,
    totalMembersBySession: 0,
    pendingDeliveries: 0,
    totalCollected: 0,
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
  on(KpiActions.loadDistributionKpiSuccess, (state, { total, totalByCommercial, active, activeByCommercial, totalAmount, totalAmountByCommercial }) => ({
    ...state,
    distributionKpi: {
      total,
      totalByCommercial,
      active,
      activeByCommercial,
      totalAmount,
      totalAmountByCommercial,
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
  }))
);
