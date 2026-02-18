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


