import { createReducer, on } from '@ngrx/store';
import * as CommercialActions from './commercial.actions';
import { Commercial } from '../../models/commercial.model';

export interface CommercialState {
  commercial: Commercial | null;
  loading: boolean;
  error: any;
}

export const initialState: CommercialState = {
  commercial: null,
  loading: false,
  error: null,
};

export const commercialReducer = createReducer(
  initialState,
  on(CommercialActions.loadCommercial, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(CommercialActions.loadCommercialSuccess, (state, { commercial }) => ({
    ...state,
    commercial,
    loading: false,
    error: null,
  })),
  on(CommercialActions.loadCommercialFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);
