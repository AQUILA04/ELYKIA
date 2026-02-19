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

export const selectLocalityPage = createSelector(
  selectLocalityState,
  (state) => state.page
);

export const selectLocalitySize = createSelector(
  selectLocalityState,
  (state) => state.size
);

export const selectLocalityHasMore = createSelector(
  selectLocalityState,
  (state) => state.hasMore
);

export const selectLocalityTotalElements = createSelector(
  selectLocalityState,
  (state) => state.totalElements
);
