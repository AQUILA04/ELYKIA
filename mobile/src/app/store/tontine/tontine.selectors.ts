import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State, tontineFeatureKey } from './tontine.reducer';

export const selectTontineState = createFeatureSelector<State>(tontineFeatureKey);

export const selectTontineSession = createSelector(
    selectTontineState,
    (state: State) => state.session
);

export const selectTontineMembers = createSelector(
    selectTontineState,
    (state: State) => state.members
);

export const selectTontineLoading = createSelector(
    selectTontineState,
    (state: State) => state.loading
);

export const selectTontineError = createSelector(
    selectTontineState,
    (state: State) => state.error
);

export const selectTontineCollections = createSelector(
    selectTontineState,
    (state: State) => state.collections
);

// Member Pagination Selectors
export const selectTontineMemberPagination = createSelector(
    selectTontineState,
    (state: State) => state.memberPagination
);

export const selectPaginatedTontineMembers = createSelector(
    selectTontineMemberPagination,
    (pagination) => pagination.items
);

export const selectTontineMemberPaginationLoading = createSelector(
    selectTontineMemberPagination,
    (pagination) => pagination.loading
);

export const selectTontineMemberPaginationError = createSelector(
    selectTontineMemberPagination,
    (pagination) => pagination.error
);

export const selectTontineMemberPaginationHasMore = createSelector(
    selectTontineMemberPagination,
    (pagination) => pagination.hasMore
);

export const selectTontineMemberPaginationTotalItems = createSelector(
    selectTontineMemberPagination,
    (pagination) => pagination.totalItems
);


export const selectTontineMemberPaginationPage = createSelector(
    selectTontineMemberPagination,
    (pagination) => pagination.currentPage
);

// Collection Pagination Selectors
export const selectTontineCollectionPagination = createSelector(
    selectTontineState,
    (state: State) => state.collectionPagination
);

export const selectPaginatedTontineCollections = createSelector(
    selectTontineCollectionPagination,
    (pagination) => pagination.items
);

export const selectTontineCollectionPaginationLoading = createSelector(
    selectTontineCollectionPagination,
    (pagination) => pagination.loading
);

export const selectTontineCollectionPaginationHasMore = createSelector(
    selectTontineCollectionPagination,
    (pagination) => pagination.hasMore
);

export const selectTontineCollectionPaginationTotalItems = createSelector(
    selectTontineCollectionPagination,
    (pagination) => pagination.totalItems
);

// Delivery Pagination Selectors
export const selectTontineDeliveryPagination = createSelector(
    selectTontineState,
    (state: State) => state.deliveryPagination
);

export const selectPaginatedTontineDeliveries = createSelector(
    selectTontineDeliveryPagination,
    (pagination) => pagination.items
);

export const selectTontineDeliveryPaginationLoading = createSelector(
    selectTontineDeliveryPagination,
    (pagination) => pagination.loading
);

export const selectTontineDeliveryPaginationHasMore = createSelector(
    selectTontineDeliveryPagination,
    (pagination) => pagination.hasMore
);

export const selectTontineDeliveryPaginationTotalItems = createSelector(
    selectTontineDeliveryPagination,
    (pagination) => pagination.totalItems
);

// Stock Pagination Selectors
export const selectTontineStockPagination = createSelector(
    selectTontineState,
    (state: State) => state.stockPagination
);

export const selectPaginatedTontineStocks = createSelector(
    selectTontineStockPagination,
    (pagination) => pagination.items
);

export const selectTontineStockPaginationLoading = createSelector(
    selectTontineStockPagination,
    (pagination) => pagination.loading
);

export const selectTontineStockPaginationHasMore = createSelector(
    selectTontineStockPagination,
    (pagination) => pagination.hasMore
);

export const selectTontineStockPaginationTotalItems = createSelector(
    selectTontineStockPagination,
    (pagination) => pagination.totalItems
);


