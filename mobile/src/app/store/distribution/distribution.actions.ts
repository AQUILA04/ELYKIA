import { createAction, props } from '@ngrx/store';
import { Distribution } from '../../models/distribution.model';
import { Article } from '../../models/article.model';

// Existing actions for distributions list
export const loadDistributions = createAction('[Distribution] Load Distributions', props<{ commercialUsername: string }>());

export const loadDistributionsSuccess = createAction(
  '[Distribution] Load Distributions Success',
  props<{ distributions: Distribution[] }>()
);

export const loadDistributionsFailure = createAction(
  '[Distribution] Load Distributions Failure',
  props<{ error: string }>()
);

export const loadDistributionsByClient = createAction(
  '[Distribution] Load Distributions By Client',
  props<{ clientId: string }>()
);

export const loadDistributionsByClientSuccess = createAction(
  '[Distribution] Load Distributions By Client Success',
  props<{ distributions: Distribution[] }>()
);

export const loadDistributionsByClientFailure = createAction(
  '[Distribution] Load Distributions By Client Failure',
  props<{ error: string }>()
);

// New actions for US006: Available Articles
export const loadAvailableArticles = createAction('[Distribution] Load Available Articles');

export const loadAvailableArticlesSuccess = createAction(
  '[Distribution] Load Available Articles Success',
  props<{ articles: Article[] }>()
);

export const loadAvailableArticlesFailure = createAction(
  '[Distribution] Load Available Articles Failure',
  props<{ error: string }>()
);

// New actions for US006: Create Distribution
export const createDistribution = createAction(
  '[Distribution] Create Distribution',
  props<{ distributionData: any }>()
);

export const createDistributionSuccess = createAction(
  '[Distribution] Create Distribution Success',
  props<{ distribution: Distribution }>()
);

export const createDistributionFailure = createAction(
  '[Distribution] Create Distribution Failure',
  props<{ error: string }>()
);

import { PrintableDistribution } from '../../core/services/printing.service';

// Print actions
export const printReceipt = createAction(
  '[Distribution] Print Receipt',
  props<{ printableDistribution: PrintableDistribution }>()
);

export const printReceiptSuccess = createAction('[Distribution] Print Receipt Success');

export const printReceiptFailure = createAction(
  '[Distribution] Print Receipt Failure',
  props<{ error: string }>()
);

// Utility actions
export const clearDistributionError = createAction('[Distribution] Clear Error');

export const clearDistributionSuccess = createAction('[Distribution] Clear Success');

export const resetDistributionState = createAction('[Distribution] Reset State');

// Sync actions for offline support
export const syncPendingDistributions = createAction('[Distribution] Sync Pending Distributions');

export const syncPendingDistributionsSuccess = createAction(
  '[Distribution] Sync Pending Distributions Success',
  props<{ syncedCount: number }>()
);

export const syncPendingDistributionsFailure = createAction(
  '[Distribution] Sync Pending Distributions Failure',
  props<{ error: string }>()
);

// Filter and search actions
export const filterDistributions = createAction(
  '[Distribution] Filter Distributions',
  props<{ filters: { status?: string; clientId?: string; dateRange?: { start: Date; end: Date } } }>()
);

export const searchDistributions = createAction(
  '[Distribution] Search Distributions',
  props<{ searchTerm: string }>()
);

// Update distribution status (for payments, etc.)
export const updateDistributionStatus = createAction(
  '[Distribution] Update Distribution Status',
  props<{ distributionId: string; status: string }>()
);

export const updateDistributionStatusSuccess = createAction(
  '[Distribution] Update Distribution Status Success',
  props<{ distribution: Distribution }>()
);

export const updateDistributionStatusFailure = createAction(
  '[Distribution] Update Distribution Status Failure',
  props<{ error: string }>()
);

// Action pour mettre à jour les montants d'une distribution
export const updateDistributionAmounts = createAction(
  '[Distribution] Update Distribution Amounts',
  props<{ distributionId: string; paidAmount: number; remainingAmount: number }>()
);

// Delete distribution
export const deleteDistribution = createAction(
  '[Distribution] Delete Distribution',
  props<{ distributionId: string }>()
);

export const deleteDistributionSuccess = createAction(
  '[Distribution] Delete Distribution Success',
  props<{ distributionId: string }>()
);

export const deleteDistributionFailure = createAction(
  '[Distribution] Delete Distribution Failure',
  props<{ error: string }>()
);

// Refresh actions
export const refreshDistributions = createAction('[Distribution] Refresh Distributions', props<{ commercialUsername: string }>());

export const refreshAvailableArticles = createAction('[Distribution] Refresh Available Articles');

// Pagination Actions for Available Articles
export const loadFirstPageAvailableArticles = createAction(
  '[Distribution] Load First Page Available Articles',
  props<{ commercialUsername?: string; pageSize?: number; filters?: { searchQuery?: string; categoryId?: string } }>()
);

export const loadFirstPageAvailableArticlesSuccess = createAction(
  '[Distribution] Load First Page Available Articles Success',
  props<{ articles: Article[]; totalElements: number; totalPages: number }>()
);

export const loadFirstPageAvailableArticlesFailure = createAction(
  '[Distribution] Load First Page Available Articles Failure',
  props<{ error: string }>()
);

export const loadNextPageAvailableArticles = createAction(
  '[Distribution] Load Next Page Available Articles',
  props<{ commercialUsername?: string; pageSize?: number; filters?: { searchQuery?: string; categoryId?: string } }>()
);

export const loadNextPageAvailableArticlesSuccess = createAction(
  '[Distribution] Load Next Page Available Articles Success',
  props<{ articles: Article[] }>()
);

export const loadNextPageAvailableArticlesFailure = createAction(
  '[Distribution] Load Next Page Available Articles Failure',
  props<{ error: string }>()
);

// Article quantity management for new distribution
export const updateArticleQuantity = createAction(
  '[Distribution] Update Article Quantity',
  props<{ articleId: string; quantity: number; article?: Article }>() // Added optional article for caching
);

export const setSelectedClient = createAction(
  '[Distribution] Set Selected Client',
  props<{ client: any }>()
);

export const clearSelectedClient = createAction('[Distribution] Clear Selected Client');

export const updateDistributionAmountsSuccess = createAction(
  '[Distribution] Update Distribution Amounts Success',
  props<{ distribution: Distribution }>()
);

export const updateDistributionAmountsFailure = createAction(
  '[Distribution] Update Distribution Amounts Failure',
  props<{ error: string }>()
);

export const deleteDistributionsByClient = createAction(
  '[Distribution] Delete Distributions By Client',
  props<{ clientId: string }>()
);

// Update distribution
export const updateDistribution = createAction(
  '[Distribution] Update Distribution',
  props<{ distributionData: any }>()
);

export const updateDistributionSuccess = createAction(
  '[Distribution] Update Distribution Success',
  props<{ distribution: Distribution }>()
);

export const updateDistributionFailure = createAction(
  '[Distribution] Update Distribution Failure',
  props<{ error: string }>()
);


// Pagination Actions
export const loadFirstPageDistributions = createAction(
  '[Distribution] Load First Page Distributions',
  props<{ commercialUsername: string; pageSize?: number; filters?: { status?: string; clientId?: string; searchQuery?: string; isLocal?: boolean; isSync?: boolean; quarter?: string; dateFilter?: any } }>()
);

export const loadFirstPageDistributionsSuccess = createAction(
  '[Distribution] Load First Page Distributions Success',
  props<{ distributions: any[]; totalElements: number; totalPages: number }>() // any[] because we might use DistributionView
);

export const loadFirstPageDistributionsFailure = createAction(
  '[Distribution] Load First Page Distributions Failure',
  props<{ error: string }>()
);

export const loadNextPageDistributions = createAction(
  '[Distribution] Load Next Page Distributions',
  props<{ commercialUsername: string; pageSize?: number; filters?: { status?: string; clientId?: string; searchQuery?: string; isLocal?: boolean; isSync?: boolean; quarter?: string; dateFilter?: any } }>()
);

export const loadNextPageDistributionsSuccess = createAction(
  '[Distribution] Load Next Page Distributions Success',
  props<{ distributions: any[] }>()
);

export const loadNextPageDistributionsFailure = createAction(
  '[Distribution] Load Next Page Distributions Failure',
  props<{ error: string }>()
);

export const resetDistributionPagination = createAction(
  '[Distribution] Reset Distribution Pagination'
);


