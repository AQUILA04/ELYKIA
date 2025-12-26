import { createAction, props } from '@ngrx/store';
import { Commercial } from '../../models/commercial.model';

export const loadCommercial = createAction(
  '[Commercial] Load Commercial',
  props<{ commercialUsername: string }>()
);

export const loadCommercialSuccess = createAction(
  '[Commercial] Load Commercial Success',
  props<{ commercial: Commercial }>()
);

export const loadCommercialFailure = createAction(
  '[Commercial] Load Commercial Failure',
  props<{ error: any }>()
);
