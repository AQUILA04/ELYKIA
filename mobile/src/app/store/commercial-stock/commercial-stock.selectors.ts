import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CommercialStockState } from './commercial-stock.reducer';

export const selectCommercialStockState = createFeatureSelector<CommercialStockState>('commercialStock');

export const selectAllCommercialStockItems = createSelector(
  selectCommercialStockState,
  (state) => state.stockItems
);

export const selectCommercialStockLoading = createSelector(
  selectCommercialStockState,
  (state) => state.loading
);

export const selectCommercialStockError = createSelector(
  selectCommercialStockState,
  (state) => state.error
);

export const selectAvailableStockItems = createSelector(
  selectAllCommercialStockItems,
  (stockItems) => stockItems.filter(item => item.quantityRemaining > 0)
);

export const selectStockItemByArticleId = (articleId: number) => createSelector(
  selectAllCommercialStockItems,
  (stockItems) => stockItems.find(item => item.articleId === articleId)
);

export const selectTotalStockValue = createSelector(
  selectAllCommercialStockItems,
  (stockItems) => stockItems.reduce((total, item) => 
    total + (item.quantityRemaining * item.creditSalePrice), 0
  )
);