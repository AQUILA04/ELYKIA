import { createReducer, on } from '@ngrx/store';
import * as AccountActions from './account.actions';
import { Account } from '../../models/account.model';

export interface AccountState {
  accounts: Account[];
  loading: boolean;
  error: any;
}

export const initialState: AccountState = {
  accounts: [],
  loading: false,
  error: null,
};

export const accountReducer = createReducer(
  initialState,
  on(AccountActions.loadAccounts, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(AccountActions.loadAccountsSuccess, (state, { accounts }) => ({
    ...state,
    accounts,
    loading: false,
    error: null,
  })),
  on(AccountActions.loadAccountsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(AccountActions.addAccountSuccess, (state, { account }) => ({
      ...state,
      accounts: [...state.accounts, account]
  })),
  on(AccountActions.updateAccountSuccess, (state, { account }) => ({
    ...state,
    accounts: state.accounts.map(a => a.id === account.id ? account : a)
  }))
);