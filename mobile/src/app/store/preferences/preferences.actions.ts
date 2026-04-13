import { createAction, props } from '@ngrx/store';
import { SyncDateFilterOption } from '../../models/sync-date-filter.model';

export const loadSyncDateFilterPreference = createAction('[Preferences] Load Sync Date Filter Preference');

export const loadSyncDateFilterPreferenceSuccess = createAction(
  '[Preferences] Load Sync Date Filter Preference Success',
  props<{ filter: SyncDateFilterOption }>()
);

export const setSyncDateFilter = createAction(
  '[Preferences] Set Sync Date Filter',
  props<{ filter: SyncDateFilterOption }>()
);

export const setSyncDateFilterSuccess = createAction(
  '[Preferences] Set Sync Date Filter Success',
  props<{ filter: SyncDateFilterOption }>()
);