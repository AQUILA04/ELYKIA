import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DistributionState } from './distribution.reducer';

export const selectDistributionState = createFeatureSelector<DistributionState>('distribution');

// Existing selectors
export const selectAllDistributions = createSelector(
  selectDistributionState,
  (state) => state.distributions
);

export const selectDistributionsLoading = createSelector(
  selectDistributionState,
  (state) => state.loading
);

export const selectDistributionsError = createSelector(
  selectDistributionState,
  (state) => state.error
);

export const selectAllDistributionItems = createSelector(
  selectDistributionState,
  (state: DistributionState) => state.items
);

export const selectActiveCreditsCount = createSelector(
  selectAllDistributions,
  (distributions) => distributions.filter(d => d.status === 'INPROGRESS').length
);

// New Distribution Selectors (US006)
export const selectSelectedClient = createSelector(
  selectDistributionState,
  (state) => state.selectedClient
);

export const selectAvailableArticles = createSelector(
  selectDistributionState,
  (state) => state.articlesPagination.items
);

// Add selectors for articles pagination
export const selectArticlesPaginationLoading = createSelector(
  selectDistributionState,
  (state) => state.articlesPagination.loading
);

export const selectArticlesPaginationError = createSelector(
  selectDistributionState,
  (state) => state.articlesPagination.error
);

export const selectArticlesPaginationTotal = createSelector(
  selectDistributionState,
  (state) => state.articlesPagination.totalItems
);

export const selectArticlesPaginationHasMore = createSelector(
  selectDistributionState,
  (state) => state.articlesPagination.hasMore
);

export const selectSelectedArticlesCache = createSelector(
  selectDistributionState,
  (state) => state.selectedArticlesCache
);

export const selectArticleQuantities = createSelector(
  selectDistributionState,
  (state) => state.articleQuantities
);

export const selectArticlesLoading = createSelector(
  selectDistributionState,
  (state) => state.articlesLoading || state.articlesPagination.loading
);

export const selectArticlesError = createSelector(
  selectDistributionState,
  (state) => state.articlesError || state.articlesPagination.error
);

export const selectCreatingDistribution = createSelector(
  selectDistributionState,
  (state) => state.creatingDistribution
);

export const selectDistributionCreated = createSelector(
  selectDistributionState,
  (state) => state.distributionCreated
);

export const selectCreateDistributionError = createSelector(
  selectDistributionState,
  (state) => state.createDistributionError
);

export const selectSelectedArticlesCount = createSelector(
  selectArticleQuantities,
  (quantities) => Object.values(quantities).filter((qty: any) => qty > 0).length
);

export const selectHasSelectedArticles = createSelector(
  selectSelectedArticlesCount,
  (count) => count > 0
);

export const selectCanCreateDistribution = createSelector(
  selectSelectedClient,
  selectHasSelectedArticles,
  (client, hasArticles) => client !== null && hasArticles
);

export const selectSelectedArticlesWithDetails = createSelector(
  selectSelectedArticlesCache,
  selectArticleQuantities,
  (cache, quantities) => {
    return Object.keys(quantities)
      .filter(id => quantities[id] > 0 && cache[id])
      .map(id => {
        const article = cache[id];
        return {
          article,
          quantity: quantities[id],
          unitPrice: article.creditSalePrice,
          totalPrice: article.creditSalePrice * quantities[id]
        };
      });
  }
);

export const selectDistributionTotalAmount = createSelector(
  selectSelectedArticlesWithDetails,
  (selectedArticles) => {
    return selectedArticles.reduce((sum, item) => sum + item.totalPrice, 0);
  }
);

export const selectDistributionDailyPayment = createSelector(
  selectDistributionTotalAmount,
  selectSelectedClient,
  (totalAmount, client) => {
    if (!client || !client.creditDuration) return 0;
    return Math.round(totalAmount / client.creditDuration);
  }
);

// Print Selectors (US007)
export const selectPrintingReceipt = createSelector(
  selectDistributionState,
  (state) => state.printingReceipt
);

export const selectPrintReceiptError = createSelector(
  selectDistributionState,
  (state) => state.printReceiptError
);

// Combined selectors for UI
export const selectDistributionSummary = createSelector(
  selectSelectedClient,
  selectSelectedArticlesCount,
  selectDistributionTotalAmount,
  selectDistributionDailyPayment,
  (client, articlesCount, totalAmount, dailyPayment) => ({
    clientName: client ? `${client.firstname} ${client.lastname}` : '',
    articlesCount,
    totalAmount,
    dailyPayment
  })
);

export const selectDistributionStats = createSelector(
  selectAllDistributions,
  (distributions) => {
    const total = distributions.length;
    const active = distributions.filter(d => d.status === 'INPROGRESS').length;
    const totalAmount = distributions
      .filter(d => d.status === 'INPROGRESS')
      .reduce((sum, d) => sum + d.totalAmount, 0);

    return {
      total,
      active,
      totalAmount
    };
  }
);

export const selectDistributionsByClientId = (clientId: string) => createSelector(
  selectAllDistributions,
  (distributions) => distributions.filter(d => d.clientId === clientId)
);

export const selectDistributionById = (distributionId: string) => createSelector(
  selectAllDistributions,
  (distributions) => distributions.find(d => d.id === distributionId)
);

export const selectDistributionsByCommercialId = (commercialId: string) => createSelector(
  selectAllDistributions,
  (distributions) => distributions.filter(d => d.commercialId === commercialId)
);


export const selectDistributionsByCommercialUsername = (commercialUsername: string) => createSelector(
  selectAllDistributions,
  (distributions) => distributions.filter(d => d.commercialId === commercialUsername)
);

// Pagination Selectors
export const selectDistributionPagination = createSelector(
  selectDistributionState,
  (state) => state.pagination
);

export const selectPaginatedDistributions = createSelector(
  selectDistributionPagination,
  (pagination) => pagination.items
);

export const selectDistributionPaginationLoading = createSelector(
  selectDistributionPagination,
  (pagination) => pagination.loading
);

export const selectDistributionPaginationError = createSelector(
  selectDistributionPagination,
  (pagination) => pagination.error
);

export const selectDistributionPaginationHasMore = createSelector(
  selectDistributionPagination,
  (pagination) => pagination.hasMore
);

export const selectDistributionPaginationTotalItems = createSelector(
  selectDistributionPagination,
  (pagination) => pagination.totalItems
);

export const selectDistributionPaginationPage = createSelector(
  selectDistributionPagination,
  (pagination) => pagination.currentPage
);

// KPI Stats Selectors

