import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PreferencesState } from './preferences.reducer';

export const selectPreferencesState = createFeatureSelector<PreferencesState>('preferences');

export const selectSyncDateFilter = createSelector(
  selectPreferencesState,
  (state) => (state.loaded ? state.syncDateFilter : 'today')
);