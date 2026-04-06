import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TransactionState } from './transaction.reducer';
import { transactionAdapter } from './transaction.reducer';

export const selectTransactionState = createFeatureSelector<TransactionState>('transaction');

const { selectAll } = transactionAdapter.getSelectors();

export const selectAllTransactions = createSelector(
  selectTransactionState,
  selectAll
);

export const selectTransactionsByClientId = (clientId: string) => selectAllTransactions;

export const selectTransactionPaginationHasMore = createSelector(selectTransactionState, state => state.hasMore);
export const selectTransactionPaginationLoading = createSelector(selectTransactionState, state => state.loading);
export const selectTransactionCurrentPage = createSelector(selectTransactionState, state => state.currentPage);
