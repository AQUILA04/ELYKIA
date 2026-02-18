import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State, orderFeatureKey } from './order.reducer';

export const selectOrderState = createFeatureSelector<State>(orderFeatureKey);

// Legacy Selectors
export const selectOrders = createSelector(
    selectOrderState,
    (state: State) => state.orders
);

export const selectOrderLoading = createSelector(
    selectOrderState,
    (state: State) => state.loading
);

export const selectOrderError = createSelector(
    selectOrderState,
    (state: State) => state.error
);

// Pagination Selectors
export const selectOrderPagination = createSelector(
    selectOrderState,
    (state: State) => state.pagination
);

export const selectPaginatedOrders = createSelector(
    selectOrderPagination,
    (pagination) => pagination.items
);

export const selectOrderPaginationLoading = createSelector(
    selectOrderPagination,
    (pagination) => pagination.loading
);

export const selectOrderPaginationError = createSelector(
    selectOrderPagination,
    (pagination) => pagination.error
);

export const selectOrderPaginationHasMore = createSelector(
    selectOrderPagination,
    (pagination) => pagination.hasMore
);

export const selectOrderPaginationTotalItems = createSelector(
    selectOrderPagination,
    (pagination) => pagination.totalItems
);

export const selectOrderPaginationPage = createSelector(
    selectOrderPagination,
    (pagination) => pagination.currentPage
);
