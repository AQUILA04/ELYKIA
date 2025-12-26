import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CommercialState } from './commercial.reducer';

export const selectCommercialState = createFeatureSelector<CommercialState>('commercial');

export const selectCommercial = createSelector(
  selectCommercialState,
  (state) => state.commercial
);

export const selectCommercialLoading = createSelector(
  selectCommercialState,
  (state) => state.loading
);

export const selectCommercialError = createSelector(
  selectCommercialState,
  (state) => state.error
);

export const selectCommercialByUsername = (username: string) => createSelector(
  selectCommercial,
  (commercial) => commercial?.username === username ? commercial : null
);
