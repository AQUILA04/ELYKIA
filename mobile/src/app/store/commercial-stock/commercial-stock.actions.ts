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

export const updateStockQuantity = createAction(
  '[Commercial Stock] Update Stock Quantity',
  props<{ articleId: number; newQuantity: number }>()
);

export const updateStockQuantitySuccess = createAction(
  '[Commercial Stock] Update Stock Quantity Success',
  props<{ articleId: number; newQuantity: number }>()
);

export const updateStockQuantityFailure = createAction(
  '[Commercial Stock] Update Stock Quantity Failure',
  props<{ error: any }>()
);

export const reduceStockQuantity = createAction(
  '[Commercial Stock] Reduce Stock Quantity',
  props<{ articles: Array<{articleId: number, quantity: number}> }>()
);

export const reduceStockQuantitySuccess = createAction(
  '[Commercial Stock] Reduce Stock Quantity Success',
  props<{ articles: Array<{articleId: number, quantity: number}> }>()
);

export const reduceStockQuantityFailure = createAction(
  '[Commercial Stock] Reduce Stock Quantity Failure',
  props<{ error: any }>()
);