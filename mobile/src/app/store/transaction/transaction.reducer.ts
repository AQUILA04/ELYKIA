import { createReducer, on } from '@ngrx/store';
import * as TransactionActions from './transaction.actions';
import { Transaction } from '../../models/transaction.model';

export interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: any;
}

export const initialState: TransactionState = {
  transactions: [],
  loading: false,
  error: null,
};

export const transactionReducer = createReducer(
  initialState,
  on(TransactionActions.loadTransactions, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(TransactionActions.loadTransactionsSuccess, (state, { transactions }) => ({
    ...state,
    transactions,
    loading: false,
    error: null,
  })),
  on(TransactionActions.loadTransactionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(TransactionActions.addTransactionSuccess, (state, { transaction }) => ({
      ...state,
      transactions: [...state.transactions, transaction]
  }))
);