import { createReducer, on } from '@ngrx/store';
import { User } from '../../models/auth.model';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: any;
}

export const initialAuthState: AuthState = {
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
};

export const authReducer = createReducer(
  initialAuthState,
  on(AuthActions.login, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(AuthActions.loginSuccess, (state, { user }) => ({
    ...state,
    user,
    isLoggedIn: true,
    isLoading: false,
    error: null,
  })),
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
  on(AuthActions.logout, (state) => ({ ...state, isLoading: false })),
  on(AuthActions.logoutSuccess, (state) => ({
    ...state,
    user: null,
    isLoggedIn: false,
    isLoading: false,
    error: null,
  })),
  on(AuthActions.logoutFailure, (state, { error }) => ({ ...state, isLoading: false, error }))
);
