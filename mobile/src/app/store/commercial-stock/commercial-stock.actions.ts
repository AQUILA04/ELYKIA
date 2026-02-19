import { createAction, props } from '@ngrx/store';
import { CommercialStockItem } from '../../models/commercial-stock-item.model';

export const loadCommercialStock = createAction(
  '[Commercial Stock] Load Commercial Stock',
  props<{ commercialUsername: string }>()
);

export const loadCommercialStockSuccess = createAction(
  '[Commercial Stock] Load Commercial Stock Success',
  props<{ stockItems: CommercialStockItem[] }>()
);

export const loadCommercialStockFailure = createAction(
  '[Commercial Stock] Load Commercial Stock Failure',
  props<{ error: any }>()
);

export const syncCommercialStock = createAction(
  '[Commercial Stock] Sync Commercial Stock',
  props<{ commercialUsername: string }>()
);

export const syncCommercialStockSuccess = createAction(
  '[Commercial Stock] Sync Commercial Stock Success',
  props<{ stockItems: CommercialStockItem[] }>()
);

export const syncCommercialStockFailure = createAction(
  '[Commercial Stock] Sync Commercial Stock Failure',
  props<{ error: any }>()
);

export const updateStockQuantity = createAction(
  '[Commercial Stock] Update Stock Quantity',
  props<{ articleId: string, quantityChange: number }>()
);

export const updateStockQuantitySuccess = createAction(
  '[Commercial Stock] Update Stock Quantity Success',
  props<{ stockItems: CommercialStockItem[] }>()
);

export const updateStockQuantityFailure = createAction(
  '[Commercial Stock] Update Stock Quantity Failure',
  props<{ error: string }>()
);

// Dashboard KPI Stats Actions

