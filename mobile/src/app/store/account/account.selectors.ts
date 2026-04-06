import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AccountState, accountAdapter } from './account.reducer';
import { Account } from '../../models/account.model';

export const selectAccountState = createFeatureSelector<AccountState>('account');

const {
  selectEntities,
  selectAll
} = accountAdapter.getSelectors(selectAccountState);

export const selectAccountEntities = selectEntities;

export const selectAccountByClientId = (clientId: string) => createSelector(
  selectAll,
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