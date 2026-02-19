import { createReducer, on } from '@ngrx/store';
import * as TontineActions from './tontine.actions';
import { PaginationState, createInitialPaginationState } from '../../core/models/pagination.model';
import { TontineMemberView, TontineCollectionView, TontineDeliveryView } from '../../models/tontine.model';

export const tontineFeatureKey = 'tontine';

export interface State {
    session: any | null;
    members: any[];
    collections: any[];
    loading: boolean;
    error: any;

    // Member Pagination
    // Member Pagination
    memberPagination: PaginationState<TontineMemberView>;
    collectionPagination: PaginationState<TontineCollectionView>;
    deliveryPagination: PaginationState<TontineDeliveryView>;
    stockPagination: PaginationState<any>; // Using any for TontineStock to avoid import issues or use TontineStock interface
}

export const initialState: State = {
    session: null,
    members: [],
    collections: [],
    loading: false,
    error: null,

    memberPagination: createInitialPaginationState<TontineMemberView>(),
    collectionPagination: createInitialPaginationState<TontineCollectionView>(),
    deliveryPagination: createInitialPaginationState<TontineDeliveryView>(),
    stockPagination: createInitialPaginationState<any>()
};

export const reducer = createReducer(
    initialState,
    on(TontineActions.loadTontineSession, state => ({
        ...state,
        loading: true,
        error: null
    })),
    on(TontineActions.loadTontineSessionSuccess, (state, { session }) => ({
        ...state,
        session,
        loading: false
    })),
    on(TontineActions.loadTontineSessionFailure, (state, { error }) => ({
        ...state,
        loading: false,
        error
    })),
    on(TontineActions.loadTontineMembers, state => ({
        ...state,
        loading: true,
        error: null
    })),
    on(TontineActions.loadTontineMembersSuccess, (state, { members }) => ({
        ...state,
        members,
        loading: false
    })),
    on(TontineActions.loadTontineMembersFailure, (state, { error }) => ({
        ...state,
        loading: false,
        error
    })),
    on(TontineActions.addTontineMemberSuccess, (state, { member }) => ({
        ...state,
        members: [...state.members, member],
        // Optimistic update for pagination? Usually we re-fetch or let user re-fetch.
        // Or we can prepend/append if we want.
        memberPagination: {
            ...state.memberPagination,
            items: [member, ...state.memberPagination.items],
            totalItems: state.memberPagination.totalItems + 1
        }
    })),
    on(TontineActions.loadTontineCollections, state => ({
        ...state,
        loading: true,
        error: null
    })),
    on(TontineActions.loadTontineCollectionsSuccess, (state, { collections }) => ({
        ...state,
        collections,
        loading: false
    })),
    on(TontineActions.loadTontineCollectionsFailure, (state, { error }) => ({
        ...state,
        loading: false,
        error
    })),

    // ==========================================
    // MEMBER PAGINATION REDUCERS
    // ==========================================
    on(TontineActions.loadFirstPageTontineMembers, (state) => ({
        ...state,
        memberPagination: {
            ...state.memberPagination,
            loading: true,
            error: null,
            currentPage: 0,
            items: [],
            hasMore: true
        }
    })),

    on(TontineActions.loadFirstPageTontineMembersSuccess, (state, { members, totalElements, totalPages }) => ({
        ...state,
        memberPagination: {
            ...state.memberPagination,
            items: members,
            totalItems: totalElements,
            // totalPages not in state
            hasMore: 0 < totalPages - 1,
            loading: false,
            error: null
        }
    })),

    on(TontineActions.loadFirstPageTontineMembersFailure, (state, { error }) => ({
        ...state,
        memberPagination: {
            ...state.memberPagination,
            loading: false,
            error
        }
    })),

    on(TontineActions.loadNextPageTontineMembers, (state) => ({
        ...state,
        memberPagination: {
            ...state.memberPagination,
            loading: true, // Only pagination loading
            error: null
        }
    })),

    on(TontineActions.loadNextPageTontineMembersSuccess, (state, { members }) => ({
        ...state,
        memberPagination: {
            ...state.memberPagination,
            items: [...state.memberPagination.items, ...members],
            currentPage: state.memberPagination.currentPage + 1,
            hasMore: (state.memberPagination.currentPage + 1 + 1) * state.memberPagination.pageSize < state.memberPagination.totalItems,
            loading: false,
            error: null
        }
    })),

    on(TontineActions.loadNextPageTontineMembersFailure, (state, { error }) => ({
        ...state,
        memberPagination: {
            ...state.memberPagination,
            loading: false,
            error
        }
    })),

    on(TontineActions.resetTontineMemberPagination, (state) => ({
        ...state,
        memberPagination: createInitialPaginationState<TontineMemberView>()
    })),

    // ==========================================
    // COLLECTION PAGINATION REDUCERS
    // ==========================================
    on(TontineActions.loadFirstPageTontineCollections, (state) => ({
        ...state,
        collectionPagination: {
            ...state.collectionPagination,
            loading: true,
            error: null,
            currentPage: 0,
            items: [],
            hasMore: true
        }
    })),

    on(TontineActions.loadFirstPageTontineCollectionsSuccess, (state, { collections, totalElements, totalPages }) => ({
        ...state,
        collectionPagination: {
            ...state.collectionPagination,
            items: collections,
            totalItems: totalElements,
            hasMore: 0 < totalPages - 1,
            loading: false,
            error: null
        }
    })),

    on(TontineActions.loadFirstPageTontineCollectionsFailure, (state, { error }) => ({
        ...state,
        collectionPagination: {
            ...state.collectionPagination,
            loading: false,
            error
        }
    })),

    on(TontineActions.loadNextPageTontineCollections, (state) => ({
        ...state,
        collectionPagination: {
            ...state.collectionPagination,
            loading: true,
            error: null
        }
    })),

    on(TontineActions.loadNextPageTontineCollectionsSuccess, (state, { collections }) => ({
        ...state,
        collectionPagination: {
            ...state.collectionPagination,
            items: [...state.collectionPagination.items, ...collections],
            currentPage: state.collectionPagination.currentPage + 1,
            hasMore: (state.collectionPagination.currentPage + 1 + 1) * state.collectionPagination.pageSize < state.collectionPagination.totalItems,
            loading: false,
            error: null
        }
    })),

    on(TontineActions.loadNextPageTontineCollectionsFailure, (state, { error }) => ({
        ...state,
        collectionPagination: {
            ...state.collectionPagination,
            loading: false,
            error
        }
    })),

    on(TontineActions.resetTontineCollectionPagination, (state) => ({
        ...state,
        collectionPagination: createInitialPaginationState<TontineCollectionView>()
    })),

    // ==========================================
    // DELIVERY PAGINATION REDUCERS
    // ==========================================
    on(TontineActions.loadFirstPageTontineDeliveries, (state) => ({
        ...state,
        deliveryPagination: {
            ...state.deliveryPagination,
            loading: true,
            error: null,
            currentPage: 0,
            items: [],
            hasMore: true
        }
    })),

    on(TontineActions.loadFirstPageTontineDeliveriesSuccess, (state, { deliveries, totalElements, totalPages }) => ({
        ...state,
        deliveryPagination: {
            ...state.deliveryPagination,
            items: deliveries,
            totalItems: totalElements,
            hasMore: 0 < totalPages - 1,
            loading: false,
            error: null
        }
    })),

    on(TontineActions.loadFirstPageTontineDeliveriesFailure, (state, { error }) => ({
        ...state,
        deliveryPagination: {
            ...state.deliveryPagination,
            loading: false,
            error
        }
    })),

    on(TontineActions.loadNextPageTontineDeliveries, (state) => ({
        ...state,
        deliveryPagination: {
            ...state.deliveryPagination,
            loading: true,
            error: null
        }
    })),

    on(TontineActions.loadNextPageTontineDeliveriesSuccess, (state, { deliveries }) => ({
        ...state,
        deliveryPagination: {
            ...state.deliveryPagination,
            items: [...state.deliveryPagination.items, ...deliveries],
            currentPage: state.deliveryPagination.currentPage + 1,
            hasMore: (state.deliveryPagination.currentPage + 1 + 1) * state.deliveryPagination.pageSize < state.deliveryPagination.totalItems,
            loading: false,
            error: null
        }
    })),

    on(TontineActions.loadNextPageTontineDeliveriesFailure, (state, { error }) => ({
        ...state,
        deliveryPagination: {
            ...state.deliveryPagination,
            loading: false,
            error
        }
    })),

    on(TontineActions.resetTontineDeliveryPagination, (state) => ({
        ...state,
        deliveryPagination: createInitialPaginationState<TontineDeliveryView>()
    })),

    // ==========================================
    // STOCK PAGINATION REDUCERS
    // ==========================================
    on(TontineActions.loadFirstPageTontineStocks, (state) => ({
        ...state,
        stockPagination: {
            ...state.stockPagination,
            loading: true,
            error: null,
            currentPage: 0,
            items: [],
            hasMore: true
        }
    })),

    on(TontineActions.loadFirstPageTontineStocksSuccess, (state, { stocks, totalElements, totalPages }) => ({
        ...state,
        stockPagination: {
            ...state.stockPagination,
            items: stocks,
            totalItems: totalElements,
            hasMore: 0 < totalPages - 1,
            loading: false,
            error: null
        }
    })),

    on(TontineActions.loadFirstPageTontineStocksFailure, (state, { error }) => ({
        ...state,
        stockPagination: {
            ...state.stockPagination,
            loading: false,
            error
        }
    })),

    on(TontineActions.loadNextPageTontineStocks, (state) => ({
        ...state,
        stockPagination: {
            ...state.stockPagination,
            loading: true,
            error: null
        }
    })),

    on(TontineActions.loadNextPageTontineStocksSuccess, (state, { stocks }) => ({
        ...state,
        stockPagination: {
            ...state.stockPagination,
            items: [...state.stockPagination.items, ...stocks],
            currentPage: state.stockPagination.currentPage + 1,
            hasMore: (state.stockPagination.currentPage + 1 + 1) * state.stockPagination.pageSize < state.stockPagination.totalItems,
            loading: false,
            error: null
        }
    })),

    on(TontineActions.loadNextPageTontineStocksFailure, (state, { error }) => ({
        ...state,
        stockPagination: {
            ...state.stockPagination,
            loading: false,
            error
        }
    })),

    on(TontineActions.resetTontineStockPagination, (state) => ({
        ...state,
        stockPagination: createInitialPaginationState<any>()
    }))
);


