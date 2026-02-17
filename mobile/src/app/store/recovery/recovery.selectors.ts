import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RecoveryState } from './recovery.reducer';
import { selectAllClients, selectClientViewsByCommercialUsername } from '../client/client.selectors';
import { selectAllDistributions } from '../distribution/distribution.selectors';
import { RecoveryView } from '../../models/recovery-view.model';

export const selectRecoveryState = createFeatureSelector<RecoveryState>('recovery');

export const selectAllRecoveries = createSelector(
  selectRecoveryState,
  (state) => state.recoveries
);

export const selectRecoveryViews = createSelector(
  selectAllRecoveries,
  selectAllClients,
  selectAllDistributions,
  (recoveries, clients, distributions) => {
    return recoveries.map(recovery => {
      const client = clients.find(c => c.id === recovery.clientId);
      const distribution = distributions.find(d => d.id === recovery.distributionId);
      const { clientId, distributionId, ...recoveryProps } = recovery;
      return {
        ...recoveryProps,
        client,
        distribution
      } as RecoveryView;
    });
  }
);

export const selectRecoveryViewById = (id: string) => createSelector(
    selectRecoveryViews,
    (recoveryViews: RecoveryView[]) => recoveryViews.find(rv => rv.id === id)
);


export const selectRecoveriesLoading = createSelector(
  selectRecoveryState,
  (state) => state.loading
);

export const selectRecoveriesError = createSelector(
  selectRecoveryState,
  (state) => state.error
);

// Nouveaux selectors pour l'US008

export const selectSelectedClient = createSelector(
  selectRecoveryState,
  (state) => state.selectedClient
);

export const selectClientCredits = createSelector(
  selectRecoveryState,
  (state) => state.clientCredits
);

export const selectSelectedCredit = createSelector(
  selectRecoveryState,
  (state) => state.selectedCredit
);

export const selectRecoveryAmount = createSelector(
  selectRecoveryState,
  (state) => state.recoveryAmount
);

export const selectValidationResult = createSelector(
  selectRecoveryState,
  (state) => state.validationResult
);

export const selectRecoveryById = (id: string) => createSelector(
  selectAllRecoveries,
  (recoveries) => recoveries.find(r => r.id === id)
);

export const selectIsCreatingRecovery = createSelector(
  selectRecoveryState,
  (state) => state.isCreatingRecovery
);

export const selectCreateRecoveryError = createSelector(
  selectRecoveryState,
  (state) => state.createRecoveryError
);

export const selectIsLoading = createSelector(
  selectRecoveryState,
  (state) => state.loading || state.isCreatingRecovery
);

export const selectError = createSelector(
  selectRecoveryState,
  (state) => state.error || state.createRecoveryError
);

export const selectCanCreateRecovery = createSelector(
  selectSelectedClient,
  selectSelectedCredit,
  selectRecoveryAmount,
  selectValidationResult,
  (client, credit, amount, validation) => {
    return !!(client && credit && amount > 0 && validation?.isValid);
  }
);

// Selector existant conservé
import { selectActiveCreditsCount } from '../distribution/distribution.selectors';

export const selectCollectionRate = createSelector(
  selectAllRecoveries,
  selectActiveCreditsCount,
  (recoveries, activeCredits) => {
    if (activeCredits === 0) {
      return 0;
    }
    const today = new Date().toISOString().slice(0, 10);
    const todayRecoveries = recoveries.filter(r => r.paymentDate.slice(0, 10) === today).length;
    return Math.round((todayRecoveries / activeCredits) * 100);
  }
);

export const selectRecoveriesByCommercialId = (commercialId: string) => createSelector(
  selectAllRecoveries,
  (recoveries) => recoveries.filter(r => r.commercialId === commercialId)
);

export const selectRecoveryViewsByCommercialId = (commercialId: string) => createSelector(
  selectRecoveryViews,
  (recoveryViews) => recoveryViews.filter(rv => rv.commercialId === commercialId)
);

export const selectRecoveryViewsByCommercialUsername = (commercialUsername: string) => createSelector(
  selectRecoveryViews,
  (recoveryViews) => recoveryViews.filter(rv => rv.commercialId === commercialUsername)
);

export const selectClientsForRecovery = (username: string) => createSelector(
  selectClientViewsByCommercialUsername(username),
  selectAllRecoveries,
  (clientViews, recoveries) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfToday.getDate() + 1);

    const recoveredTodayClientIds = new Set(
      recoveries
        .filter(r => {
          const paymentDate = new Date(r.paymentDate);
          return paymentDate >= startOfToday && paymentDate < startOfTomorrow;
        })
        .map(r => r.clientId)
    );

    return clientViews.filter(client => client.creditInProgress && !recoveredTodayClientIds.has(String(client.id)));
  }
);

// ==================== PAGINATION SELECTORS ====================

export const selectRecoveryPagination = createSelector(
  selectRecoveryState,
  (state) => state.pagination
);

export const selectPaginatedRecoveries = createSelector(
  selectRecoveryPagination,
  (pagination) => pagination.items
);

export const selectRecoveryPaginationLoading = createSelector(
  selectRecoveryPagination,
  (pagination) => pagination.loading
);

export const selectRecoveryPaginationError = createSelector(
  selectRecoveryPagination,
  (pagination) => pagination.error
);

export const selectRecoveryPaginationHasMore = createSelector(
  selectRecoveryPagination,
  (pagination) => pagination.hasMore
);

export const selectRecoveryPaginationCurrentPage = createSelector(
  selectRecoveryPagination,
  (pagination) => pagination.currentPage
);

export const selectRecoveryPaginationTotalItems = createSelector(
  selectRecoveryPagination,
  (pagination) => pagination.totalItems
);

export const selectRecoveryPaginationTotalPages = createSelector(
  selectRecoveryPagination,
  (pagination) => pagination.totalPages
);

/**
 * Selector for paginated recovery views (with client and distribution information)
 */
export const selectPaginatedRecoveryViews = createSelector(
  selectPaginatedRecoveries,
  selectAllClients,
  selectAllDistributions,
  (recoveries, clients, distributions): RecoveryView[] => {
    return recoveries.map(recovery => {
      const client = clients.find(c => c.id === recovery.clientId);
      const distribution = distributions.find(d => d.id === recovery.distributionId);
      const { clientId, distributionId, ...recoveryProps } = recovery;
      return {
        ...recoveryProps,
        client,
        distribution
      } as RecoveryView;
    });
  }
);
