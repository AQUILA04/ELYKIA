import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ClientState } from './client.reducer';
import { selectAccountEntities } from '../account/account.selectors';
import { ClientView } from '../../models/client-view.model';
import { Client } from '../../models/client.model';
// Import the adapter selectors from the reducer
import { selectAllClients as selectAllClientsFromReducer, selectTotalClients } from './client.reducer';

export const selectClientState = createFeatureSelector<ClientState>('client');

/**
 * @deprecated Use selectPaginatedClients or selectClientById instead.
 * This selector returns ALL clients in the store, which can be very large.
 */
export const selectAllClients = createSelector(
  selectClientState,
  selectAllClientsFromReducer
);

export const selectClientsLoading = createSelector(
  selectClientState,
  (state) => state.loading
);

export const selectClientsError = createSelector(
  selectClientState,
  (state) => state.error
);

// Optimized selector: Create a map of accounts indexed by clientId for O(1) lookup
export const selectAccountsMap = createSelector(
  selectAccountEntities,
  (accountEntities) => {
    // accountEntities is already a dictionary, but is it indexed by account id or client id?
    // Assuming Account entity id is the account's unique id, we still need to find by clientId.
    // However, the previous reducer created a map indexed by clientId:
    // `accounts.reduce((acc, account) => ({ ...acc, [account.clientId]: account }), {})`
    // We should use Object.values() if we only have selectAccountEntities
    const accountsArray = Object.values(accountEntities).filter(a => !!a);
    return accountsArray.reduce((acc: { [key: string]: any }, account: any) => ({ ...acc, [account.clientId]: account }), {});
  }
);

/**
 * @deprecated Use selectPaginatedClientViews instead.
 * This selector maps ALL clients in the store, which is expensive.
 */
export const selectClientViews = createSelector(
  selectAllClients,
  selectAccountsMap,
  (clients: Client[], accountsMap: { [key: string]: any }): ClientView[] => {
    return clients.map(client => ({
      ...client,
      account: accountsMap[client.id]
    }));
  }
);

/**
 * @deprecated Use server-side filtering via loadFirstPageClients with filters.
 */
export const selectClientViewsByCommercialUsername = (username: string) => createSelector(
  selectClientViews,
  (clientViews) => clientViews.filter(cv => cv.commercial === username)
);

// Using the selector from the reducer that leverages @ngrx/entity
export const selectTotalClientsFromState = createSelector(
  selectClientState,
  (state) => selectTotalClients(state) // This refers to the selector from the reducer
);

export const selectClientViewById = (id: string) => createSelector(
  selectClientState,
  selectAccountsMap,
  (state, accountsMap) => {
    // Use dictionary lookup from EntityState
    const client = state.entities[id];
    if (!client) return undefined;

    // Explicitly cast accountsMap to allow string indexing or use a safer access method
    const account = (accountsMap as any)[client.id];

    return {
      ...client,
      account: account
    } as ClientView;
  }
);

// Sélecteur similaire pour les données brutes
export const selectRawClientById = (id: string) => createSelector(
  selectClientState,
  (state) => state.entities[id]
);

export const selectClientById = (id: string) => createSelector(
  selectClientState,
  (state) => state.entities[id]
);

export const selectClientByPhone = (phone: string) => createSelector(
  selectAllClients,
  (clients: Client[]) => clients.find(c => c.phone === phone)
);

/**
 * @deprecated Use server-side filtering.
 */
export const selectClientsByCommercialId = (commercialId: string) => createSelector(
  selectAllClients,
  (clients: Client[]) => clients.filter(c => c.commercial === commercialId)
);

/**
 * @deprecated Use server-side filtering.
 */
export const selectClientsByCommercialUsername = (username: string) => createSelector(
  selectAllClients,
  (clients: Client[]) => clients.filter(c => c.commercial === username)
);

// ==================== PAGINATION SELECTORS ====================

export const selectClientPagination = createSelector(
  selectClientState,
  (state) => state.pagination
);

export const selectPaginatedClients = createSelector(
  selectClientPagination,
  (pagination) => pagination.items
);

export const selectClientPaginationLoading = createSelector(
  selectClientPagination,
  (pagination) => pagination.loading
);

export const selectClientPaginationError = createSelector(
  selectClientPagination,
  (pagination) => pagination.error
);

export const selectClientPaginationHasMore = createSelector(
  selectClientPagination,
  (pagination) => pagination.hasMore
);

export const selectClientPaginationCurrentPage = createSelector(
  selectClientPagination,
  (pagination) => pagination.currentPage
);

export const selectClientPaginationTotalItems = createSelector(
  selectClientPagination,
  (pagination) => pagination.totalItems
);


/**
 * Selector for paginated client views (with account information)
 */
export const selectPaginatedClientViews = createSelector(
  selectPaginatedClients,
  selectAccountsMap,
  (clients: Client[], accountsMap: { [key: string]: any }): ClientView[] => {
    return clients.map(client => ({
      ...client,
      account: accountsMap[client.id]
    }));
  }
);
