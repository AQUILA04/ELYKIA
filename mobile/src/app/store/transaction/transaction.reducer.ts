import { createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import * as TransactionActions from './transaction.actions';
import { Transaction } from '../../models/transaction.model';

export interface TransactionState extends EntityState<Transaction> {
  loading: boolean;
  error: any;
  currentPage: number;
  hasMore: boolean;
  currentClientId: string | null;
}

export const transactionAdapter: EntityAdapter<Transaction> = createEntityAdapter<Transaction>({
  sortComparer: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
});

export const initialState: TransactionState = transactionAdapter.getInitialState({
  loading: false,
  error: null,
  currentPage: 0,
  hasMore: true,
  currentClientId: null,
});

export const transactionReducer = createReducer(
  initialState,
  on(TransactionActions.loadTransactionsByClient, (state, { clientId, page }) => {
    if (state.currentClientId !== clientId || page === 0) {
      return transactionAdapter.removeAll({
        ...state,
        loading: true,
        error: null,
        currentPage: 0,
        hasMore: true,
        currentClientId: clientId
      });
    }
    return { ...state, loading: true, error: null };
  }),
  on(TransactionActions.loadTransactionsByClientSuccess, (state, { transactions, page, hasMore, clientId }) => {
    if (state.currentClientId !== clientId) return state;
    return transactionAdapter.upsertMany(transactions, {
      ...state,
      loading: false,
      currentPage: page,
      hasMore,
    });
  }),
  on(TransactionActions.loadTransactionsByClientFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(TransactionActions.addTransactionSuccess, (state, { transaction }) => {
    if (state.currentClientId !== transaction.clientId) return state;
    return transactionAdapter.addOne(transaction, state);
  }),
  on(TransactionActions.resetTransactions, (state) => transactionAdapter.removeAll({ ...state, currentClientId: null, currentPage: 0, hasMore: true }))
);