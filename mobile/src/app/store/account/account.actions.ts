import { createAction, props } from '@ngrx/store';
import { Account } from '../../models/account.model';

export const loadAccounts = createAction(
  '[Account] Load Accounts'
);

export const loadAccountsSuccess = createAction(
  '[Account] Load Accounts Success',
  props<{ accounts: Account[] }>()
);

export const loadAccountsFailure = createAction(
  '[Account] Load Accounts Failure',
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
