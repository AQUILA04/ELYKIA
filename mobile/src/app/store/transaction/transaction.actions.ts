import { createAction, props } from '@ngrx/store';
import { Transaction } from '../../models/transaction.model';

export const loadTransactions = createAction(
  '[Transaction] Load Transactions'
);

export const loadTransactionsSuccess = createAction(
  '[Transaction] Load Transactions Success',
  props<{ transactions: Transaction[] }>()
);

export const loadTransactionsFailure = createAction(
  '[Transaction] Load Transactions Failure',
  props<{ error: any }>()
);

export const addTransaction = createAction(
  '[Transaction] Add Transaction',
  props<{ transaction: Partial<Transaction> }>()
);

export const addTransactionSuccess = createAction(
  '[Transaction] Add Transaction Success',
  props<{ transaction: Transaction }>()
);
