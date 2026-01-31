import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CommercialStockState } from './commercial-stock.reducer';

export const selectCommercialStockState = createFeatureSelector<CommercialStockState>('commercialStock');

export const selectAllCommercialStockItems = createSelector(
  selectCommercialStockState,
  (state: CommercialStockState) => state.stockItems
);

export const selectCommercialStockLoading = createSelector(
  selectCommercialStockState,
  (state: CommercialStockState) => state.loading
);

export const selectCommercialStockError = createSelector(
  selectCommercialStockState,
  (state: CommercialStockState) => state.error
);

export const selectAvailableStockItems = createSelector(
    selectAllCommercialStockItems,
    (items) => items.filter(item => item.quantityRemaining > 0)
);
