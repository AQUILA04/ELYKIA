import { createFeatureSelector, createSelector } from '@ngrx/store';
import { StockOutputState } from './stock-output.reducer';

export const selectStockOutputState = createFeatureSelector<StockOutputState>('stockOutput');

export const selectAllStockOutputs = createSelector(
  selectStockOutputState,
  (state) => state.stockOutputs
);

export const selectStockOutputsLoading = createSelector(
  selectStockOutputState,
  (state) => state.loading
);

export const selectStockOutputsError = createSelector(
  selectStockOutputState,
  (state) => state.error
);

export const selectStockOutputsByCommercialUsername = (commercialUsername: string) => createSelector(
  selectAllStockOutputs,
  (stockOutputs) => stockOutputs.filter(so => so.commercialId === commercialUsername)
);
