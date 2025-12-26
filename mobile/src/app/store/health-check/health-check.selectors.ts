import { createFeatureSelector, createSelector } from '@ngrx/store';
import { HealthCheckState } from './health-check.reducer';

export const selectHealthCheckState = createFeatureSelector<HealthCheckState>('healthCheck');

export const selectIsOnline = createSelector(
  selectHealthCheckState,
  (state) => state.isOnline
);