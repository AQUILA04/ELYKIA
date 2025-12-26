import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TransactionState } from './transaction.reducer';

export const selectTransactionState = createFeatureSelector<TransactionState>('transaction');

export const selectAllTransactions = createSelector(
  selectTransactionState,
  (state) => state.transactions
);

export const selectTransactionsByClientId = (clientId: string) => createSelector(
  selectAllTransactions,
  (transactions) => transactions
    .filter(t => t.clientId === clientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
);
