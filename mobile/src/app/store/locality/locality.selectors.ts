import { createFeatureSelector, createSelector } from '@ngrx/store';
import { LocalityState } from './locality.reducer';

export const selectLocalityState = createFeatureSelector<LocalityState>('localities');

export const selectAllLocalities = createSelector(
  selectLocalityState,
  (state) => state.localities
);

export const selectLocalitiesLoading = createSelector(
  selectLocalityState,
  (state) => state.loading
);

export const selectLocalitiesError = createSelector(
  selectLocalityState,
  (state) => state.error
);
