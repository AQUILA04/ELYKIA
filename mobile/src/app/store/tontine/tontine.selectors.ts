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
