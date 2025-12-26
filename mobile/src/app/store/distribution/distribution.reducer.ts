import { createReducer, on } from '@ngrx/store';
import { Distribution } from '../../models/distribution.model';
import { Article } from '../../models/article.model';
import * as DistributionActions from './distribution.actions';
import { DistributionItem } from '../../models/distribution-item.model';

export interface DistributionState {
  distributions: Distribution[];
  items: DistributionItem[]; // <-- ADDED
  loading: boolean;
  error: string | null;

  // New state for US006 & US007
  availableArticles: Article[];
  articlesLoading: boolean;
  articlesError: string | null;

  creatingDistribution: boolean;
  distributionCreated: boolean;
  createDistributionError: string | null;

  printingReceipt: boolean;
  printReceiptError: string | null;

  // New distribution form state
  selectedClient: any | null;
  articleQuantities: { [articleId: string]: number };

  // Filter and search state
  filters: {
    status?: string;
    clientId?: string;
    dateRange?: { start: Date; end: Date };
  };
  searchTerm: string;

  // Sync state
  syncingPending: boolean;
  syncError: string | null;
  lastSyncDate: Date | null;
}

export const initialState: DistributionState = {
  distributions: [],
  items: [], // <-- ADDED
  loading: false,
  error: null,

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

  // Load Distributions
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

  // ... (rest of the file is the same)
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

