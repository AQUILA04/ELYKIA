import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import * as ClientActions from './client.actions';
import { Client } from '../../models/client.model';
import { PaginationState, createInitialPaginationState, updatePaginationState, resetPaginationState } from '../../core/models/pagination.model';

// Define the entity adapter for Client
export const adapter: EntityAdapter<Client> = createEntityAdapter<Client>({
  selectId: (client: Client) => client.id,
});

export interface ClientState extends EntityState<Client> {
  loading: boolean;
  error: any;

  // Pagination state
  pagination: PaginationState<Client>;
}

export const initialState: ClientState = adapter.getInitialState({
  loading: false,
  error: null,

  // Initialize pagination state
  pagination: createInitialPaginationState<Client>(),
});

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
  on(ClientActions.loadClientsSuccess, (state, { clients }) => {
    // Use adapter to add all clients to the state
    // Ensure no base64 data is stored in the state, only file paths
    const sanitizedClients = clients.map(client => {
      // Ensure properties are either strings or undefined, not null
      const profilPhoto = typeof client.profilPhoto === 'string' && client.profilPhoto.startsWith('data:') ? undefined : client.profilPhoto;
      const cardPhoto = typeof client.cardPhoto === 'string' && client.cardPhoto.startsWith('data:') ? undefined : client.cardPhoto;
      const profilPhotoUrl = typeof client.profilPhotoUrl === 'string' && client.profilPhotoUrl.startsWith('data:') ? undefined : client.profilPhotoUrl;
      const cardPhotoUrl = typeof client.cardPhotoUrl === 'string' && client.cardPhotoUrl.startsWith('data:') ? undefined : client.cardPhotoUrl;

      return {
        ...client,
        profilPhoto: profilPhoto || undefined,
        cardPhoto: cardPhoto || undefined,
        profilPhotoUrl: profilPhotoUrl || undefined,
        cardPhotoUrl: cardPhotoUrl || undefined,
      } as Client;
    });

    return adapter.setAll(sanitizedClients, {
      ...state,
      loading: false,
      error: null,
    });
  }),
  on(ClientActions.loadClientsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // ==================== PAGINATION ACTIONS ====================

  on(ClientActions.loadFirstPageClients, (state) => ({
    ...state,
    pagination: { ...state.pagination, loading: true, error: null }
  })),

  on(ClientActions.loadFirstPageClientsSuccess, (state, { page }) => {
    // Sanitize clients to ensure no base64 data is stored
    const sanitizedContent = page.content.map(client => {
      // Ensure properties are either strings or undefined, not null
      const profilPhoto = typeof client.profilPhoto === 'string' && client.profilPhoto.startsWith('data:') ? undefined : client.profilPhoto;
      const cardPhoto = typeof client.cardPhoto === 'string' && client.cardPhoto.startsWith('data:') ? undefined : client.cardPhoto;
      const profilPhotoUrl = typeof client.profilPhotoUrl === 'string' && client.profilPhotoUrl.startsWith('data:') ? undefined : client.profilPhotoUrl;
      const cardPhotoUrl = typeof client.cardPhotoUrl === 'string' && client.cardPhotoUrl.startsWith('data:') ? undefined : client.cardPhotoUrl;

      return {
        ...client,
        profilPhoto: profilPhoto || undefined,
        cardPhoto: cardPhoto || undefined,
        profilPhotoUrl: profilPhotoUrl || undefined,
        cardPhotoUrl: cardPhotoUrl || undefined,
      } as Client;
    });

    // Use adapter to set the first page of clients in the state
    // NOTE: We use setAll here because we assume the first page replaces the current view
    // However, if we want to keep previously loaded clients (e.g. for details view), we might want upsertMany.
    // But for memory optimization, setAll is better as it clears old data.
    // If detail view needs data, it should fetch it individually if missing.
    const newState = adapter.setAll(sanitizedContent, state);
    return {
      ...newState,
      pagination: {
        ...state.pagination,
        items: sanitizedContent,
        currentPage: page.page,
        pageSize: page.size,
        totalItems: page.totalElements,
        hasMore: page.page + 1 < page.totalPages,
        loading: false,
        error: null
      }
    };
  }),

  on(ClientActions.loadFirstPageClientsFailure, (state, { error }) => ({
    ...state,
    pagination: { ...state.pagination, loading: false, error }
  })),

  on(ClientActions.loadNextPageClients, (state) => ({
    ...state,
    pagination: { ...state.pagination, loading: true, error: null }
  })),

  on(ClientActions.loadNextPageClientsSuccess, (state, { page }) => {
    // Sanitize clients to ensure no base64 data is stored
    const sanitizedContent = page.content.map(client => {
      // Ensure properties are either strings or undefined, not null
      const profilPhoto = typeof client.profilPhoto === 'string' && client.profilPhoto.startsWith('data:') ? undefined : client.profilPhoto;
      const cardPhoto = typeof client.cardPhoto === 'string' && client.cardPhoto.startsWith('data:') ? undefined : client.cardPhoto;
      const profilPhotoUrl = typeof client.profilPhotoUrl === 'string' && client.profilPhotoUrl.startsWith('data:') ? undefined : client.profilPhotoUrl;
      const cardPhotoUrl = typeof client.cardPhotoUrl === 'string' && client.cardPhotoUrl.startsWith('data:') ? undefined : client.cardPhotoUrl;

      return {
        ...client,
        profilPhoto: profilPhoto || undefined,
        cardPhoto: cardPhoto || undefined,
        profilPhotoUrl: profilPhotoUrl || undefined,
        cardPhotoUrl: cardPhotoUrl || undefined,
      } as Client;
    });

    // Use adapter to add the next page of clients to the state
    const newState = adapter.upsertMany(sanitizedContent, state);
    return {
      ...newState,
      pagination: {
        ...state.pagination,
        items: [...state.pagination.items, ...sanitizedContent],
        currentPage: page.page,
        totalItems: page.totalElements,
        hasMore: page.page + 1 < page.totalPages,
        loading: false,
        error: null
      }
    };
  }),

  on(ClientActions.loadNextPageClientsFailure, (state, { error }) => ({
    ...state,
    pagination: { ...state.pagination, loading: false, error }
  })),

  on(ClientActions.resetClientPagination, (state) => {
    // When resetting pagination, we might want to clear the entity state too to free memory
    // But we should be careful if other parts of the app rely on loaded clients.
    // For strict memory optimization as per plan, we clear it.
    const newState = adapter.removeAll(state);
    return {
      ...newState,
      pagination: resetPaginationState(state.pagination)
    };
  }),

  // ==================== CRUD ACTIONS ====================

  on(ClientActions.addClient, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(ClientActions.addClientSuccess, (state, { client }) => {
    // Sanitize the client to ensure no base64 data is stored
    const sanitizedClient = {
      ...client,
      profilPhoto: typeof client.profilPhoto === 'string' && client.profilPhoto.startsWith('data:') ? undefined : client.profilPhoto,
      cardPhoto: typeof client.cardPhoto === 'string' && client.cardPhoto.startsWith('data:') ? undefined : client.cardPhoto,
      profilPhotoUrl: typeof client.profilPhotoUrl === 'string' && client.profilPhotoUrl.startsWith('data:') ? undefined : client.profilPhotoUrl,
      cardPhotoUrl: typeof client.cardPhotoUrl === 'string' && client.cardPhotoUrl.startsWith('data:') ? undefined : client.cardPhotoUrl,
    } as Client;

    // Use adapter to add or update the client in the state
    return adapter.upsertOne(sanitizedClient, {
      ...state,
      // Update pagination list (prepend new client)
      pagination: {
        ...state.pagination,
        items: [sanitizedClient, ...state.pagination.items],
        totalItems: state.pagination.totalItems + 1
      },
      loading: false,
      error: null
    });
  }),
  on(ClientActions.addClientFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(ClientActions.deleteClientSuccess, (state, { id }) => {
    // Use adapter to remove the client from the state
    const newState = adapter.removeOne(id, state);
    return {
      ...newState,
      // Update pagination list
      pagination: {
        ...state.pagination,
        items: state.pagination.items.filter(client => client.id !== id),
        totalItems: Math.max(0, state.pagination.totalItems - 1)
      },
      loading: false,
      error: null,
    };
  }),

  on(ClientActions.updateClientBalanceSuccess, (state, { client }) => {
    // Sanitize the client to ensure no base64 data is stored
    const sanitizedClient = {
      ...client,
      profilPhoto: typeof client.profilPhoto === 'string' && client.profilPhoto.startsWith('data:') ? undefined : client.profilPhoto,
      cardPhoto: typeof client.cardPhoto === 'string' && client.cardPhoto.startsWith('data:') ? undefined : client.cardPhoto,
      profilPhotoUrl: typeof client.profilPhotoUrl === 'string' && client.profilPhotoUrl.startsWith('data:') ? undefined : client.profilPhotoUrl,
      cardPhotoUrl: typeof client.cardPhotoUrl === 'string' && client.cardPhotoUrl.startsWith('data:') ? undefined : client.cardPhotoUrl,
    } as Client;

    // Use adapter to update the client in the state
    return adapter.upsertOne(sanitizedClient, {
      ...state,
      // Update pagination list
      pagination: {
        ...state.pagination,
        items: state.pagination.items.map(c => c.id === client.id ? sanitizedClient : c)
      }
    });
  }),

  on(ClientActions.updateClientSuccess, (state, { client }) => {
    // Sanitize the client to ensure no base64 data is stored
    const sanitizedClient = {
      ...client,
      profilPhoto: typeof client.profilPhoto === 'string' && client.profilPhoto.startsWith('data:') ? undefined : client.profilPhoto,
      cardPhoto: typeof client.cardPhoto === 'string' && client.cardPhoto.startsWith('data:') ? undefined : client.cardPhoto,
      profilPhotoUrl: typeof client.profilPhotoUrl === 'string' && client.profilPhotoUrl.startsWith('data:') ? undefined : client.profilPhotoUrl,
      cardPhotoUrl: typeof client.cardPhotoUrl === 'string' && client.cardPhotoUrl.startsWith('data:') ? undefined : client.cardPhotoUrl,
    } as Client;

    // Use adapter to update the client in the state
    return adapter.upsertOne(sanitizedClient, {
      ...state,
      // Update pagination list
      pagination: {
        ...state.pagination,
        items: state.pagination.items.map(c => c.id === client.id ? sanitizedClient : c)
      }
    });
  }),

  on(ClientActions.updateClientLocationSuccess, (state, { client }) => {
    // Sanitize the client to ensure no base64 data is stored
    const sanitizedClient = {
      ...client,
      profilPhoto: typeof client.profilPhoto === 'string' && client.profilPhoto.startsWith('data:') ? undefined : client.profilPhoto,
      cardPhoto: typeof client.cardPhoto === 'string' && client.cardPhoto.startsWith('data:') ? undefined : client.cardPhoto,
      profilPhotoUrl: typeof client.profilPhotoUrl === 'string' && client.profilPhotoUrl.startsWith('data:') ? undefined : client.profilPhotoUrl,
      cardPhotoUrl: typeof client.cardPhotoUrl === 'string' && client.cardPhotoUrl.startsWith('data:') ? undefined : client.cardPhotoUrl,
    } as Client;

    // Use adapter to update the client in the state
    return adapter.upsertOne(sanitizedClient, {
      ...state,
      // Update pagination list
      pagination: {
        ...state.pagination,
        items: state.pagination.items.map(c => c.id === client.id ? sanitizedClient : c)
      }
    });
  }),

  on(ClientActions.updateClientPhotosAndInfoSuccess, (state, { client }) => {
    // Sanitize the client to ensure no base64 data is stored
    const sanitizedClient = {
      ...client,
      profilPhoto: typeof client.profilPhoto === 'string' && client.profilPhoto.startsWith('data:') ? undefined : client.profilPhoto,
      cardPhoto: typeof client.cardPhoto === 'string' && client.cardPhoto.startsWith('data:') ? undefined : client.cardPhoto,
      profilPhotoUrl: typeof client.profilPhotoUrl === 'string' && client.profilPhotoUrl.startsWith('data:') ? undefined : client.profilPhotoUrl,
      cardPhotoUrl: typeof client.cardPhotoUrl === 'string' && client.cardPhotoUrl.startsWith('data:') ? undefined : client.cardPhotoUrl,
    } as Client;

    // Use adapter to update the client in the state
    return adapter.upsertOne(sanitizedClient, {
      ...state,
      // Update pagination list
      pagination: {
        ...state.pagination,
        items: state.pagination.items.map(c => c.id === client.id ? sanitizedClient : c)
      }
    });
  })
);

// Export adapter selectors
export const {
  selectIds: selectClientIds,
  selectEntities: selectClientEntities,
  selectAll: selectAllClients,
  selectTotal: selectTotalClients,
} = adapter.getSelectors();
