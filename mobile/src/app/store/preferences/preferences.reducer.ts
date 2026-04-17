import { createReducer, on } from '@ngrx/store';
import { SyncDateFilterOption } from '../../models/sync-date-filter.model';
import * as PreferencesActions from './preferences.actions';

export interface PreferencesState {
  syncDateFilter: SyncDateFilterOption;
  loaded: boolean;
}

export const initialState: PreferencesState = {
  syncDateFilter: 'today',
  loaded: false,
};

export const preferencesReducer = createReducer(
  initialState,
  on(PreferencesActions.loadSyncDateFilterPreferenceSuccess, (state, { filter }) => ({
    ...state,
    syncDateFilter: filter,
    loaded: true,
  })),
  on(PreferencesActions.setSyncDateFilterSuccess, (state, { filter }) => ({
    ...state,
    syncDateFilter: filter,
  }))
);