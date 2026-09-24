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
  ),
  on(AccountActions.updateAccountClientId, (state, { oldClientId, newClientId }) => {
    const updates = Object.values(state.entities)
      .filter((acc): acc is Account => !!acc && String(acc.clientId) === String(oldClientId))
      .map(acc => ({
        id: acc.id,
        changes: { clientId: newClientId }
      }));
    if (updates.length === 0) return state;
    return accountAdapter.updateMany(updates, state);
  }),
  on(AccountActions.accountSyncSuccess, (state, { localId, serverId }) => {
    const localIdStr = String(localId);
    const serverIdStr = String(serverId);
    const existing = state.entities[localIdStr] || state.entities[serverIdStr];
    if (!existing) {
      return state;
    }
    const synced: Account = {
      ...existing,
      id: serverIdStr,
      isSync: true,
      isLocal: false
    };
    let next = state;
    if (localIdStr !== serverIdStr) {
      next = accountAdapter.removeOne(localIdStr, next);
    }
    return accountAdapter.upsertOne(synced, { ...next, error: null });
  })
);
