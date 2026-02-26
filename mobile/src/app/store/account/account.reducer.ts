import { createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import * as AccountActions from './account.actions';
import { Account } from '../../models/account.model';

export interface AccountState extends EntityState<Account> {
  loading: boolean;
  error: any;
}

export const accountAdapter: EntityAdapter<Account> = createEntityAdapter<Account>({
  selectId: (account: Account) => account.id
});

export const initialState: AccountState = accountAdapter.getInitialState({
  loading: false,
  error: null,
});

export const accountReducer = createReducer(
  initialState,
  on(AccountActions.loadAccountByClientId, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(AccountActions.loadAccountByClientIdSuccess, (state, { account }) => {
    if (!account) return { ...state, loading: false, error: null };
    return accountAdapter.upsertOne(account, { ...state, loading: false, error: null });
  }),
  on(AccountActions.loadAccountByClientIdFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(AccountActions.loadAccountsByClientIds, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(AccountActions.loadAccountsByClientIdsSuccess, (state, { accounts }) => {
    return accountAdapter.upsertMany(accounts, { ...state, loading: false, error: null });
  }),
  on(AccountActions.loadAccountsByClientIdsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(AccountActions.addAccountSuccess, (state, { account }) =>
    accountAdapter.addOne(account, state)
  ),
  on(AccountActions.updateAccountSuccess, (state, { account }) =>
    accountAdapter.updateOne({ id: account.id, changes: account }, state)
  )
);
