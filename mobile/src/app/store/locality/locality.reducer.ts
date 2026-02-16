import { createReducer, on } from '@ngrx/store';
import { Locality } from 'src/app/models/locality.model';
import * as LocalityActions from './locality.actions';

export interface LocalityState {
  localities: Locality[];
  loading: boolean;
  error: any;
}

export const initialState: LocalityState = {
  localities: [],
  loading: false,
  error: null,
};

export const localityReducer = createReducer(
  initialState,
  on(LocalityActions.loadLocalities, (state) => ({
    ...state,
    loading: true,
  })),
  on(LocalityActions.loadLocalitiesSuccess, (state, { localities }) => {
    return {
      ...state,
      localities,
      loading: false,
    };
  }),
  on(LocalityActions.loadLocalitiesFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  })),
  on(LocalityActions.addLocality, (state) => ({
    ...state,
    loading: true,
  })),
  on(LocalityActions.addLocalitySuccess, (state, { locality }) => ({
    ...state,
    localities: [locality, ...state.localities],
    loading: false,
  })),
  on(LocalityActions.addLocalityFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  }))
);
