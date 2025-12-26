import { createAction, props } from '@ngrx/store';
import { StockOutput } from '../../models/stock-output.model';

export const loadStockOutputs = createAction(
  '[Stock Output] Load Stock Outputs',
  props<{ commercialUsername: string }>()
);

export const loadStockOutputsSuccess = createAction(
  '[Stock Output] Load Stock Outputs Success',
  props<{ stockOutputs: StockOutput[] }>()
);

export const loadStockOutputsFailure = createAction(
  '[Stock Output] Load Stock Outputs Failure',
  props<{ error: any }>()
);
