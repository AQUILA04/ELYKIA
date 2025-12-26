import { createAction, props } from '@ngrx/store';

export const checkOnlineStatus = createAction(
  '[HealthCheck] Check Online Status'
);

export const setOnlineStatus = createAction(
  '[HealthCheck] Set Online Status',
  props<{ isOnline: boolean }>()
);