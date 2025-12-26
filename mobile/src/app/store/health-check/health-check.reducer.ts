import { createReducer, on } from '@ngrx/store';
import * as HealthCheckActions from './health-check.actions';

export interface HealthCheckState {
  isOnline: boolean;
}

export const initialState: HealthCheckState = {
  isOnline: false,
};

export const healthCheckReducer = createReducer(
  initialState,
  on(HealthCheckActions.setOnlineStatus, (state, { isOnline }) => ({
    ...state,
    isOnline,
  }))
);