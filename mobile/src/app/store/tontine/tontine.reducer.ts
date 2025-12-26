import { createReducer, on } from '@ngrx/store';
import * as TontineActions from './tontine.actions';

export const tontineFeatureKey = 'tontine';

export interface State {
    session: any | null;
    members: any[];
    collections: any[];
    loading: boolean;
    error: any;
}

export const initialState: State = {
    session: null,
    members: [],
    collections: [],
    loading: false,
    error: null
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
        members: [...state.members, member]
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
    }))
);
