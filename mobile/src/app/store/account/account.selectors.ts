import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AccountState } from './account.reducer';
import { Account } from '../../models/account.model';

export const selectAccountState = createFeatureSelector<AccountState>('account');

export const selectAllAccounts = createSelector(
  selectAccountState,
  (state) => state.accounts
);

export const selectAccountByClientId = (clientId: string) => createSelector(
  selectAllAccounts,
  (accounts: Account[]) => accounts.find(a => a.clientId === clientId)
);

export const selectAccountsLoading = createSelector(
  selectAccountState,
  (state) => state.loading
);

export const selectAccountsError = createSelector(
  selectAccountState,
  (state) => state.error
);