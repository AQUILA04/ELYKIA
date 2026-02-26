import { createReducer, on } from '@ngrx/store';
import * as StockOutputActions from './stock-output.actions';
import { StockOutput } from '../../models/stock-output.model';

export interface StockOutputState {
  stockOutputs: StockOutput[];
  loading: boolean;
  error: any;
}

export const initialState: StockOutputState = {
  stockOutputs: [],
  loading: false,
  error: null,
};

export const stockOutputReducer = createReducer(
  initialState,
  on(StockOutputActions.loadStockOutputs, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(StockOutputActions.loadStockOutputsSuccess, (state, { stockOutputs }) => ({
    ...state,
    loading: false,
    error: null,
  })),
  on(StockOutputActions.loadStockOutputsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);
