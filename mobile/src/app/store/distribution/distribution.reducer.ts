import { createReducer, on } from '@ngrx/store';
import { Distribution } from '../../models/distribution.model';
import { Article } from '../../models/article.model';
import * as DistributionActions from './distribution.actions';
import { DistributionItem } from '../../models/distribution-item.model';
import { PaginationState, createInitialPaginationState } from '../../core/models/pagination.model';
import { DistributionView } from '../../models/distribution-view.model'; // Ensure this exists or use any

export interface DistributionState {
  distributions: Distribution[];
  items: DistributionItem[];
  loading: boolean;
  error: string | null;

  // Pagination for List View
  pagination: PaginationState<DistributionView>;

  availableArticles: Article[];
  articlesLoading: boolean;
  articlesError: string | null;

  creatingDistribution: boolean;
  distributionCreated: boolean;
  createDistributionError: string | null;

  printingReceipt: boolean;
  printReceiptError: string | null;

  selectedClient: any | null;
  articleQuantities: { [articleId: string]: number };

  filters: {
    status?: string;
    clientId?: string;
    dateRange?: { start: Date; end: Date };
  };
  searchTerm: string;

  syncingPending: boolean;
  syncError: string | null;
  lastSyncDate: Date | null;
}

export const initialState: DistributionState = {
  distributions: [],
  items: [],
  loading: false,
  error: null,

  pagination: createInitialPaginationState<DistributionView>(),

  availableArticles: [],
  articlesLoading: false,
  articlesError: null,

  creatingDistribution: false,
  distributionCreated: false,
  createDistributionError: null,

  printingReceipt: false,
  printReceiptError: null,

  selectedClient: null,
  articleQuantities: {},

  filters: {},
  searchTerm: '',

  syncingPending: false,
  syncError: null,
  lastSyncDate: null
};

export const distributionReducer = createReducer(
  initialState,

  // Load Distributions (Legacy)
  on(DistributionActions.loadDistributions, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DistributionActions.loadDistributionsSuccess, (state, { distributions }) => {
    const items = distributions.reduce((acc, d) => acc.concat(d.items || []), [] as DistributionItem[]);
    return {
      ...state,
      distributions,
      items: items,
      loading: false,
      error: null
    };
  }),

  on(DistributionActions.loadDistributionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // ==========================================
  // PAGINATION REDUCERS
  // ==========================================
  on(DistributionActions.loadFirstPageDistributions, (state) => ({
    ...state,
    pagination: {
      ...state.pagination,
      loading: true,
      error: null,
      currentPage: 0,
      items: [], // Clear items on reload first page
      hasMore: true
    }
  })),

  on(DistributionActions.loadFirstPageDistributionsSuccess, (state, { distributions, totalElements, totalPages }) => ({
    ...state,
    pagination: {
      ...state.pagination,
      items: distributions,
      totalItems: totalElements,
      // totalPages is not in PaginationState
      hasMore: 0 < totalPages - 1, // Or (0 + 1) * pageSize < totalItems
      loading: false,
      error: null
    }
  })),

  on(DistributionActions.loadFirstPageDistributionsFailure, (state, { error }) => ({
    ...state,
    pagination: {
      ...state.pagination,
      loading: false,
      error
    }
  })),

  on(DistributionActions.loadNextPageDistributions, (state) => ({
    ...state,
    pagination: {
      ...state.pagination,
      loading: true,
      error: null
    }
  })),

  on(DistributionActions.loadNextPageDistributionsSuccess, (state, { distributions }) => ({
    ...state,
    pagination: {
      ...state.pagination,
      items: [...state.pagination.items, ...distributions],
      currentPage: state.pagination.currentPage + 1,
      hasMore: (state.pagination.currentPage + 1 + 1) * state.pagination.pageSize < state.pagination.totalItems,
      loading: false,
      error: null
    }
  })),

  on(DistributionActions.loadNextPageDistributionsFailure, (state, { error }) => ({
    ...state,
    pagination: {
      ...state.pagination,
      loading: false,
      error
    }
  })),

  on(DistributionActions.resetDistributionPagination, (state) => ({
    ...state,
    pagination: createInitialPaginationState<DistributionView>()
  })),

  // ... (rest of the file as before, just ensuring imports and closing brace)

  // Load Available Articles
  on(DistributionActions.loadAvailableArticles, (state) => ({
    ...state,
    articlesLoading: true,
    articlesError: null
  })),

  on(DistributionActions.loadAvailableArticlesSuccess, (state, { articles }) => ({
    ...state,
    availableArticles: articles,
    articlesLoading: false,
    articlesError: null
  })),

  on(DistributionActions.loadAvailableArticlesFailure, (state, { error }) => ({
    ...state,
    articlesLoading: false,
    articlesError: error
  })),

  // Create Distribution
  on(DistributionActions.createDistribution, (state) => ({
    ...state,
    creatingDistribution: true,
    distributionCreated: false,
    createDistributionError: null
  })),

  on(DistributionActions.createDistributionSuccess, (state, { distribution }) => ({
    ...state,
    distributions: [distribution, ...state.distributions],
    pagination: {
      ...state.pagination,
      items: [distribution as unknown as DistributionView, ...state.pagination.items], // Optimistic update
      totalItems: state.pagination.totalItems + 1
    },
    creatingDistribution: false,
    distributionCreated: true,
    createDistributionError: null
  })),

  on(DistributionActions.createDistributionFailure, (state, { error }) => ({
    ...state,
    creatingDistribution: false,
    distributionCreated: false,
    createDistributionError: error
  })),

  // Print Receipt
  on(DistributionActions.printReceipt, (state) => ({
    ...state,
    printingReceipt: true,
    printReceiptError: null
  })),

  on(DistributionActions.printReceiptSuccess, (state) => ({
    ...state,
    printingReceipt: false
  })),

  on(DistributionActions.printReceiptFailure, (state, { error }) => ({
    ...state,
    printingReceipt: false,
    printReceiptError: error
  })),

  // Update Distribution Status
  on(DistributionActions.updateDistributionStatus, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DistributionActions.updateDistributionStatusSuccess, (state, { distribution }) => ({
    ...state,
    distributions: state.distributions.map(d =>
      d.id === distribution.id ? distribution : d
    ),
    pagination: {
      ...state.pagination,
      // Preserve existing items (with articles) from the view, only update status/fields from distribution
      items: state.pagination.items.map(d => d.id === distribution.id ? { ...d, ...distribution, items: d.items } : d)
    },
    loading: false,
    error: null
  })),

  on(DistributionActions.updateDistributionStatusFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete Distribution
  on(DistributionActions.deleteDistribution, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DistributionActions.deleteDistributionSuccess, (state, { distributionId }) => ({
    ...state,
    distributions: state.distributions.filter(d => d.id !== distributionId),
    pagination: {
      ...state.pagination,
      items: state.pagination.items.filter(d => d.id !== distributionId),
      totalItems: state.pagination.totalItems - 1
    },
    loading: false,
    error: null
  })),

  on(DistributionActions.deleteDistributionFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Filter and Search
  on(DistributionActions.filterDistributions, (state, { filters }) => ({
    ...state,
    filters
  })),

  on(DistributionActions.searchDistributions, (state, { searchTerm }) => ({
    ...state,
    searchTerm
  })),

  // Sync Pending Distributions
  on(DistributionActions.syncPendingDistributions, (state) => ({
    ...state,
    syncingPending: true,
    syncError: null
  })),

  on(DistributionActions.syncPendingDistributionsSuccess, (state, { syncedCount }) => ({
    ...state,
    syncingPending: false,
    syncError: null,
    lastSyncDate: new Date()
  })),

  on(DistributionActions.syncPendingDistributionsFailure, (state, { error }) => ({
    ...state,
    syncingPending: false,
    syncError: error
  })),

  // Utility Actions
  on(DistributionActions.clearDistributionError, (state) => ({
    ...state,
    error: null,
    articlesError: null,
    createDistributionError: null,
    printReceiptError: null,
    syncError: null
  })),

  on(DistributionActions.clearDistributionSuccess, (state) => ({
    ...state,
    distributionCreated: false
  })),

  on(DistributionActions.resetDistributionState, (state) => ({
    ...state,
    selectedClient: null,
    articleQuantities: {},
    creatingDistribution: false,
    distributionCreated: false,
    createDistributionError: null
  })),

  // Refresh Actions
  on(DistributionActions.refreshDistributions, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DistributionActions.refreshAvailableArticles, (state) => ({
    ...state,
    articlesLoading: true,
    articlesError: null
  })),

  // Article quantity management
  on(DistributionActions.updateArticleQuantity, (state, { articleId, quantity }) => ({
    ...state,
    articleQuantities: {
      ...state.articleQuantities,
      [articleId]: quantity
    }
  })),

  // Client selection
  on(DistributionActions.setSelectedClient, (state, { client }) => ({
    ...state,
    selectedClient: client
  })),

  on(DistributionActions.clearSelectedClient, (state) => ({
    ...state,
    selectedClient: null,
    articleQuantities: {}
  })),
  on(DistributionActions.updateDistributionAmounts, (state) => ({
    ...state,
    loading: true
  })),

  on(DistributionActions.updateDistributionAmountsSuccess, (state, { distribution }) => ({
    ...state,
    distributions: state.distributions.map(d =>
      d.id === distribution.id ? distribution : d
    ),
    loading: false,
    error: null
  })),

  on(DistributionActions.updateDistributionAmountsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(DistributionActions.deleteDistributionsByClient, (state, { clientId }) => ({
    ...state,
    distributions: state.distributions.filter(d => d.clientId !== clientId),
  }))
);

// KPI Stats


