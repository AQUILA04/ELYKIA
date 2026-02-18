import { createReducer, on } from '@ngrx/store';
import * as TontineActions from './tontine.actions';
import { PaginationState, createInitialPaginationState } from '../../core/models/pagination.model';
import { TontineMemberView } from '../../models/tontine.model';

export const tontineFeatureKey = 'tontine';

export interface State {
    session: any | null;
    members: any[];
    collections: any[];
    loading: boolean;
    error: any;

    // Member Pagination
    memberPagination: PaginationState<TontineMemberView>;
}

export const initialState: State = {
    session: null,
    members: [],
    collections: [],
    loading: false,
    error: null,

    memberPagination: createInitialPaginationState<TontineMemberView>()
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
    }))
);


