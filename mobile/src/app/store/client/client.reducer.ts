import { createReducer, on } from '@ngrx/store';
import * as ClientActions from './client.actions';
import { Client } from '../../models/client.model';

export interface ClientState {
  clients: Client[];
  loading: boolean;
  error: any;
}

export const initialState: ClientState = {
  clients: [],
  loading: false,
  error: null,
};

export const clientReducer = createReducer(
  initialState,
  on(ClientActions.loadClients, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(ClientActions.loadClientsSuccess, (state, { clients }) => ({
    ...state,
    clients,
    loading: false,
    error: null,
  })),
  on(ClientActions.loadClientsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(ClientActions.addClient, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(ClientActions.addClientSuccess, (state, { client }) => {
    // Vérifiez que le client n'existe pas déjà
    const clientExists = state.clients.some(c => String(c.id) === String(client.id));

    return {
      ...state,
      clients: clientExists
        ? state.clients.map(c => String(c.id) === String(client.id) ? client : c)
        : [...state.clients, client],
      loading: false,
      error: null
    };
  }),
  on(ClientActions.addClientFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(ClientActions.deleteClientSuccess, (state, { id }) => ({
    ...state,
    clients: state.clients.filter(client => client.id !== id),
    loading: false,
    error: null,
  })),
  on(ClientActions.updateClientBalanceSuccess, (state, { client }) => ({
    ...state,
    clients: state.clients.map(c => c.id === client.id ? client : c),
  })),
  on(ClientActions.updateClientSuccess, (state, { client }) => ({
    ...state,
    clients: state.clients.map(c => c.id === client.id ? client : c),
  })),
  on(ClientActions.updateClientLocationSuccess, (state, { client }) => ({
    ...state,
    clients: state.clients.map(c => c.id === client.id ? client : c),
  })),
  on(ClientActions.updateClientPhotosAndInfoSuccess, (state, { client }) => ({
    ...state,
    clients: state.clients.map(c => c.id === client.id ? client : c),
  }))
);
