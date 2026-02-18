import { createAction, props } from '@ngrx/store';
import { DateFilter } from '../../core/models/date-filter.model';

// ==================== CLIENT KPI ACTIONS ====================

export const loadClientKpi = createAction(
  '[KPI] Load Client KPI',
  props<{ commercialUsername?: string; dateFilter?: DateFilter }>()
);

export const loadClientKpiSuccess = createAction(
  '[KPI] Load Client KPI Success',
  props<{ total: number; totalByCommercial: number }>()
);

export const loadClientKpiFailure = createAction(
  '[KPI] Load Client KPI Failure',
  props<{ error: string }>()
);

// ==================== RECOVERY KPI ACTIONS ====================

export const loadRecoveryKpi = createAction(
  '[KPI] Load Recovery KPI',
  props<{ commercialId?: string; dateFilter?: DateFilter }>()
);

export const loadRecoveryKpiSuccess = createAction(
  '[KPI] Load Recovery KPI Success',
  props<{ 
    total: number; 
    totalByCommercial: number; 
    today: number; 
    totalAmount: number; 
    totalAmountByCommercial: number;
    todayAmount: number;
  }>()
);

export const loadRecoveryKpiFailure = createAction(
  '[KPI] Load Recovery KPI Failure',
  props<{ error: string }>()
);

// ==================== DISTRIBUTION KPI ACTIONS ====================

export const loadDistributionKpi = createAction(
  '[KPI] Load Distribution KPI',
  props<{ commercialId?: string; dateFilter?: DateFilter }>()
);

export const loadDistributionKpiSuccess = createAction(
  '[KPI] Load Distribution KPI Success',
  props<{ 
    total: number; 
    totalByCommercial: number; 
    active: number; 
    activeByCommercial: number;
    totalAmount: number;
    totalAmountByCommercial: number;
  }>()
);

export const loadDistributionKpiFailure = createAction(
  '[KPI] Load Distribution KPI Failure',
  props<{ error: string }>()
);

// ==================== ARTICLE KPI ACTIONS ====================

export const loadArticleKpi = createAction(
  '[KPI] Load Article KPI'
);

export const loadArticleKpiSuccess = createAction(
  '[KPI] Load Article KPI Success',
  props<{ total: number }>()
);

export const loadArticleKpiFailure = createAction(
  '[KPI] Load Article KPI Failure',
  props<{ error: string }>()
);

// ==================== ORDER KPI ACTIONS ====================

export const loadOrderKpi = createAction(
  '[KPI] Load Order KPI',
  props<{ commercialId?: string; dateFilter?: DateFilter }>()
);

export const loadOrderKpiSuccess = createAction(
  '[KPI] Load Order KPI Success',
  props<{ total: number; totalByCommercial: number }>()
);

export const loadOrderKpiFailure = createAction(
  '[KPI] Load Order KPI Failure',
  props<{ error: string }>()
);

// ==================== TONTINE KPI ACTIONS ====================

export const loadTontineKpi = createAction(
  '[KPI] Load Tontine KPI',
  props<{ sessionId?: string; commercialUsername?: string; dateFilter?: DateFilter }>()
);

export const loadTontineKpiSuccess = createAction(
  '[KPI] Load Tontine KPI Success',
  props<{ 
    totalMembers: number; 
    totalMembersBySession: number; 
    pendingDeliveries: number; 
    totalCollected: number 
  }>()
);

export const loadTontineKpiFailure = createAction(
  '[KPI] Load Tontine KPI Failure',
  props<{ error: string }>()
);

// ==================== COMBINED ACTIONS ====================

/**
 * Load all KPIs at once
 * Useful for dashboard initialization
 */
export const loadAllKpi = createAction(
  '[KPI] Load All KPI',
  props<{ 
    commercialUsername?: string; 
    commercialId?: string; 
    sessionId?: string;
    dateFilter?: DateFilter;
  }>()
);
