import { createReducer, on } from '@ngrx/store';
import * as ClientActions from './client.actions';
import { Client } from '../../models/client.model';
import { PaginationState, createInitialPaginationState, updatePaginationState, resetPaginationState, appendPaginationItems } from '../../core/models/pagination.model';

export interface ClientState {
  clients: Client[];
  loading: boolean;
  error: any;
  
  // Pagination state
  pagination: PaginationState<Client>;
}

export const initialState: ClientState = {
  clients: [],
  loading: false,
  error: null,
  
  // Initialize pagination state
  pagination: createInitialPaginationState<Client>(),
};

export const clientReducer = createReducer(
  initialState,
  
  // ==================== LEGACY LOAD ALL CLIENTS ====================
  // These actions load all clients at once (non-paginated)
  // Will be deprecated after full migration to pagination
  
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
  
  // ==================== PAGINATION ACTIONS ====================
  
  on(ClientActions.loadFirstPageClients, (state) => ({
    ...state,
    pagination: updatePaginationState(state.pagination, { loading: true, error: null })
  })),
  
  on(ClientActions.loadFirstPageClientsSuccess, (state, { page }) => ({
    ...state,
    pagination: {
      ...state.pagination,
      items: page.content,
      currentPage: page.page,
      pageSize: page.size,
      totalItems: page.totalElements,
      totalPages: page.totalPages,
      hasMore: page.page + 1 < page.totalPages,
      loading: false,
      error: null
    }
  })),
  
  on(ClientActions.loadFirstPageClientsFailure, (state, { error }) => ({
    ...state,
    pagination: updatePaginationState(state.pagination, { loading: false, error })
  })),
  
  on(ClientActions.loadNextPageClients, (state) => ({
    ...state,
    pagination: updatePaginationState(state.pagination, { loading: true, error: null })
  })),
  
  on(ClientActions.loadNextPageClientsSuccess, (state, { page }) => ({
    ...state,
    pagination: appendPaginationItems(state.pagination, page.content, {
      currentPage: page.page,
      totalItems: page.totalElements,
      totalPages: page.totalPages,
      hasMore: page.page + 1 < page.totalPages,
      loading: false,
      error: null
    })
  })),
  
  on(ClientActions.loadNextPageClientsFailure, (state, { error }) => ({
    ...state,
    pagination: updatePaginationState(state.pagination, { loading: false, error })
  })),
  
  on(ClientActions.resetClientPagination, (state) => ({
    ...state,
    pagination: resetPaginationState(state.pagination)
  })),
  
  // ==================== CRUD ACTIONS ====================
  
  on(ClientActions.addClient, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(ClientActions.addClientSuccess, (state, { client }) => {
    // Vérifiez que le client n'existe pas déjà dans la liste legacy
    const clientExists = state.clients.some(c => String(c.id) === String(client.id));
    
    // Vérifiez que le client n'existe pas déjà dans la pagination
    const clientExistsInPagination = state.pagination.items.some(c => String(c.id) === String(client.id));

    return {
      ...state,
      // Update legacy list
      clients: clientExists
        ? state.clients.map(c => String(c.id) === String(client.id) ? client : c)
        : [...state.clients, client],
      // Update pagination list (prepend new client)
      pagination: {
        ...state.pagination,
        items: clientExistsInPagination
          ? state.pagination.items.map(c => String(c.id) === String(client.id) ? client : c)
          : [client, ...state.pagination.items],
        totalItems: clientExistsInPagination ? state.pagination.totalItems : state.pagination.totalItems + 1
      },
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
    // Update legacy list
    clients: state.clients.filter(client => client.id !== id),
    // Update pagination list
    pagination: {
      ...state.pagination,
      items: state.pagination.items.filter(client => client.id !== id),
      totalItems: Math.max(0, state.pagination.totalItems - 1)
    },
    loading: false,
    error: null,
  })),
  
  on(ClientActions.updateClientBalanceSuccess, (state, { client }) => ({
    ...state,
    // Update legacy list
    clients: state.clients.map(c => c.id === client.id ? client : c),
    // Update pagination list
    pagination: {
      ...state.pagination,
      items: state.pagination.items.map(c => c.id === client.id ? client : c)
    }
  })),
  
  on(ClientActions.updateClientSuccess, (state, { client }) => ({
    ...state,
    // Update legacy list
    clients: state.clients.map(c => c.id === client.id ? client : c),
    // Update pagination list
    pagination: {
      ...state.pagination,
      items: state.pagination.items.map(c => c.id === client.id ? client : c)
    }
  })),
  
  on(ClientActions.updateClientLocationSuccess, (state, { client }) => ({
    ...state,
    // Update legacy list
    clients: state.clients.map(c => c.id === client.id ? client : c),
    // Update pagination list
    pagination: {
      ...state.pagination,
      items: state.pagination.items.map(c => c.id === client.id ? client : c)
    }
  })),
  
  on(ClientActions.updateClientPhotosAndInfoSuccess, (state, { client }) => ({
    ...state,
    // Update legacy list
    clients: state.clients.map(c => c.id === client.id ? client : c),
    // Update pagination list
    pagination: {
      ...state.pagination,
      items: state.pagination.items.map(c => c.id === client.id ? client : c)
    }
  }))
);
