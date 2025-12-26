import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ClientState } from './client.reducer';
import { selectAllAccounts } from '../account/account.selectors';
import { ClientView } from '../../models/client-view.model';

export const selectClientState = createFeatureSelector<ClientState>('client');

export const selectAllClients = createSelector(
  selectClientState,
  (state) => state.clients
);

export const selectClientsLoading = createSelector(
  selectClientState,
  (state) => state.loading
);

export const selectClientsError = createSelector(
  selectClientState,
  (state) => state.error
);

export const selectClientViews = createSelector(
  selectAllClients,
  selectAllAccounts,
  (clients, accounts): ClientView[] => {
    return clients.map(client => ({
      ...client,
      account: accounts.find(account => account.clientId === client.id)
    }));
  }
);

export const selectClientViewsByCommercialUsername = (username: string) => createSelector(
  selectClientViews,
  (clientViews) => clientViews.filter(cv => cv.commercial === username)
);

export const selectTotalClients = createSelector(
  selectAllClients,
  (clients) => clients.length
);

export const selectClientViewById = (id: string) => createSelector(
  selectClientViews,
  (clientViews) => clientViews.find(cv => String(cv.id) === String(id))
);

// Sélecteur similaire pour les données brutes
export const selectRawClientById = (id: string) => createSelector(
  selectAllClients,
  (clients) => clients.find(c => String(c.id) === String(id))
);

export const selectClientById = (id: string) => createSelector(
  selectAllClients,
  (clients) => clients.find(c => c.id === id)
);

export const selectClientByPhone = (phone: string) => createSelector(
  selectAllClients,
  (clients) => clients.find(c => c.phone === phone)
);

export const selectClientsByCommercialId = (commercialId: string) => createSelector(
  selectAllClients,
  (clients) => clients.filter(c => c.commercial === commercialId)
);

export const selectClientsByCommercialUsername = (username: string) => createSelector(
  selectAllClients,
  (clients) => clients.filter(c => c.commercial === username)
);
