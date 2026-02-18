import { createReducer, on } from '@ngrx/store';
import * as RecoveryActions from './recovery.actions';
import { Recovery } from '../../models/recovery.model';
import { Distribution } from '../../models/distribution.model';
import { Client } from '../../models/client.model';
import { PaginationState, createInitialPaginationState, resetPaginationState } from '../../core/models/pagination.model';

export interface RecoveryState {
  recoveries: Recovery[];
  loading: boolean;
  error: any;

  // Nouveaux états pour l'US008
  selectedClient: Client | null;
  clientCredits: Distribution[];
  selectedCredit: Distribution | null;
  recoveryAmount: number;
  validationResult: {
    isValid: boolean;
    message: string;
  } | null;
  isCreatingRecovery: boolean;
  createRecoveryError: any;

  // Pagination state
  pagination: PaginationState<Recovery>;
}

export const initialState: RecoveryState = {
  recoveries: [],
  loading: false,
  error: null,

  // Nouveaux états initiaux
  selectedClient: null,
  clientCredits: [],
  selectedCredit: null,
  recoveryAmount: 0,
  validationResult: null,
  isCreatingRecovery: false,
  createRecoveryError: null,

  // Initialize pagination state
  pagination: createInitialPaginationState<Recovery>()
};

export const recoveryReducer = createReducer(
  initialState,

  // ==================== LEGACY LOAD ALL RECOVERIES ====================

  on(RecoveryActions.loadRecoveries, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(RecoveryActions.loadRecoveriesSuccess, (state, { recoveries }) => ({
    ...state,
    recoveries,
    loading: false,
    error: null,
  })),
  on(RecoveryActions.loadRecoveriesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // ==================== PAGINATION ACTIONS ====================

  on(RecoveryActions.loadFirstPageRecoveries, (state) => ({
    ...state,
    pagination: {
      ...state.pagination,
      loading: true,
      error: null
    }
  })),

  on(RecoveryActions.loadFirstPageRecoveriesSuccess, (state, { page }) => ({
    ...state,
    pagination: {
      ...state.pagination,
      items: page.content,
      currentPage: page.page,
      pageSize: page.size,
      totalItems: page.totalElements,
      totalPages: page.totalPages,
      hasMore: page.page + 1 < page.totalPages,
      loading: false,
      error: null
    }
  })),

  on(RecoveryActions.loadFirstPageRecoveriesFailure, (state, { error }) => ({
    ...state,
    pagination: {
      ...state.pagination,
      loading: false,
      error
    }
  })),

  on(RecoveryActions.loadNextPageRecoveries, (state) => ({
    ...state,
    pagination: {
      ...state.pagination,
      loading: true,
      error: null
    }
  })),

  on(RecoveryActions.loadNextPageRecoveriesSuccess, (state, { page }) => ({
    ...state,
    pagination: {
      ...state.pagination,
      items: [...state.pagination.items, ...page.content],
      currentPage: page.page,
      totalItems: page.totalElements,
      // totalPages: page.totalPages, // Not in PaginationState
      hasMore: page.page + 1 < page.totalPages,
      loading: false,
      error: null
    }
  })),

  on(RecoveryActions.loadNextPageRecoveriesFailure, (state, { error }) => ({
    ...state,
    pagination: {
      ...state.pagination,
      loading: false,
      error
    }
  })),

  on(RecoveryActions.resetRecoveryPagination, (state) => ({
    ...state,
    pagination: resetPaginationState(state.pagination)
  })),

  // ==================== US008 RECOVERY WORKFLOW ====================

  on(RecoveryActions.setSelectedClient, (state, { client }) => ({
    ...state,
    selectedClient: client,
    clientCredits: [],
    selectedCredit: null,
    recoveryAmount: 0,
    validationResult: null,
  })),

  on(RecoveryActions.loadClientCredits, (state) => ({
    ...state,
    loading: true,
    error: null,
    clientCredits: [],
  })),

  on(RecoveryActions.loadClientCreditsSuccess, (state, { credits }) => ({
    ...state,
    clientCredits: credits,
    loading: false,
    error: null,
  })),

  on(RecoveryActions.loadClientCreditsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    clientCredits: [],
  })),

  on(RecoveryActions.selectCredit, (state, { distributionId }) => {
    const selectedCredit = state.clientCredits.find(credit => credit.id === distributionId) || null;
    return {
      ...state,
      selectedCredit,
      recoveryAmount: 0,
      validationResult: null,
    };
  }),

  on(RecoveryActions.setRecoveryAmount, (state, { amount }) => ({
    ...state,
    recoveryAmount: amount,
  })),

  on(RecoveryActions.validateRecoveryAmount, (state) => ({
    ...state,
    validationResult: null,
  })),

  on(RecoveryActions.validateRecoveryAmountSuccess, (state, { isValid, message }) => ({
    ...state,
    validationResult: { isValid, message },
  })),

  on(RecoveryActions.validateRecoveryAmountFailure, (state, { error }) => ({
    ...state,
    validationResult: { isValid: false, message: 'Erreur de validation' },
    error,
  })),

  on(RecoveryActions.createRecovery, (state) => ({
    ...state,
    isCreatingRecovery: true,
    createRecoveryError: null,
  })),

  on(RecoveryActions.createRecoverySuccess, (state, { recovery }) => ({
    ...state,
    // Update legacy list
    recoveries: [...state.recoveries, recovery],
    // Update pagination list (prepend new recovery)
    pagination: {
      ...state.pagination,
      items: [recovery, ...state.pagination.items],
      totalItems: state.pagination.totalItems + 1
    },
    isCreatingRecovery: false,
    createRecoveryError: null,
  })),

  on(RecoveryActions.createRecoveryFailure, (state, { error }) => ({
    ...state,
    isCreatingRecovery: false,
    createRecoveryError: error,
  })),

  on(RecoveryActions.clearRecoveryState, () => initialState),

  on(RecoveryActions.resetRecoveryForm, (state) => ({
    ...state,
    selectedClient: null,
    clientCredits: [],
    selectedCredit: null,
    recoveryAmount: 0,
    validationResult: null,
    createRecoveryError: null,
  })),

  on(RecoveryActions.deleteRecoveriesByDistributionIds, (state, { distributionIds }) => ({
    ...state,
    // Update legacy list
    recoveries: state.recoveries.filter(r => !distributionIds.includes(r.distributionId)),
    // Update pagination list
    pagination: {
      ...state.pagination,
      items: state.pagination.items.filter(r => !distributionIds.includes(r.distributionId)),
      totalItems: Math.max(0, state.pagination.totalItems - distributionIds.length)
    }
  }))
);


