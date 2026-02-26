import { createAction, props } from '@ngrx/store';
import { Account } from '../../models/account.model';

export const loadAccountByClientId = createAction(
  '[Account] Load Account By Client Id',
  props<{ clientId: string }>()
);

export const loadAccountByClientIdSuccess = createAction(
  '[Account] Load Account By Client Id Success',
  props<{ account: Account | null }>()
);

export const loadAccountByClientIdFailure = createAction(
  '[Account] Load Account By Client Id Failure',
  props<{ error: any }>()
);

export const loadAccountsByClientIds = createAction(
  '[Account] Load Accounts By Client Ids',
  props<{ clientIds: string[] }>()
);

export const loadAccountsByClientIdsSuccess = createAction(
  '[Account] Load Accounts By Client Ids Success',
  props<{ accounts: Account[] }>()
);

export const loadAccountsByClientIdsFailure = createAction(
  '[Account] Load Accounts By Client Ids Failure',
  props<{ error: any }>()
);

export const addAccount = createAction(
  '[Account] Add Account',
  props<{ account: Account }>()
);

export const addAccountSuccess = createAction(
  '[Account] Add Account Success',
  props<{ account: Account }>()
);

export const updateAccount = createAction(
  '[Account] Update Account',
  props<{ account: Account }>()
);

export const updateAccountSuccess = createAction(
  '[Account] Update Account Success',
  props<{ account: Account }>()
);

export const updateAccountFailure = createAction(
  '[Account] Update Account Failure',
  props<{ error: any }>()
);
