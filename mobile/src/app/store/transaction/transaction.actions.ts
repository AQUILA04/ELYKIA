import { createAction, props } from '@ngrx/store';
import { Transaction } from '../../models/transaction.model';

export const loadTransactionsByClient = createAction(
  '[Transaction] Load Transactions By Client',
  props<{ clientId: string; page: number; size: number }>()
);

export const loadTransactionsByClientSuccess = createAction(
  '[Transaction] Load Transactions By Client Success',
  props<{ transactions: Transaction[]; page: number; hasMore: boolean; clientId: string }>()
);

export const loadTransactionsByClientFailure = createAction(
  '[Transaction] Load Transactions By Client Failure',
  props<{ error: any }>()
);

export const resetTransactions = createAction(
  '[Transaction] Reset Transactions'
);

export const addTransaction = createAction(
  '[Transaction] Add Transaction',
  props<{ transaction: Partial<Transaction> }>()
);

export const addTransactionSuccess = createAction(
  '[Transaction] Add Transaction Success',
  props<{ transaction: Transaction }>()
);
