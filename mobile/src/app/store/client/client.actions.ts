import { createAction, props } from '@ngrx/store';
import { Client } from '../../models/client.model';

export const loadClients = createAction(
  '[Client] Load Clients',
  props<{ commercialUsername: string }>()
);

export const loadClientsSuccess = createAction(
  '[Client] Load Clients Success',
  props<{ clients: Client[] }>()
);

export const loadClientsFailure = createAction(
  '[Client] Load Clients Failure',
  props<{ error: any }>()
);

export const addClient = createAction(
  '[Client] Add Client',
  props<{ client: any, commercialUsername: string }>()
);

export const addClientSuccess = createAction(
  '[Client] Add Client Success',
  props<{ client: Client }>()
);

export const addClientFailure = createAction(
  '[Client] Add Client Failure',
  props<{ error: any }>()
);

export const updateClientCreditStatus = createAction(
  '[Client] Update Client Credit Status',
  props<{ clientId: string; creditInProgress: boolean }>()
);

export const loadClientViewsUpdate = createAction('[Client] Load Client Views Update');

export const deleteClient = createAction(
  '[Client] Delete Client',
  props<{ id: string }>()
);

export const deleteClientSuccess = createAction(
  '[Client] Delete Client Success',
  props<{ id: string }>()
);

export const deleteClientFailure = createAction(
  '[Client] Delete Client Failure',
  props<{ error: any }>()
);

export const updateClientBalance = createAction(
  '[Client] Update Client Balance',
  props<{ clientId: string; balance: number }>()
);

export const updateClientBalanceSuccess = createAction(
  '[Client] Update Client Balance Success',
  props<{ client: Client }>()
);

export const updateClientBalanceFailure = createAction(
  '[Client] Update Client Balance Failure',
  props<{ error: any }>()
);

export const updateClient = createAction(
  '[Client] Update Client',
  props<{ client: Client }>()
);

export const updateClientSuccess = createAction(
  '[Client] Update Client Success',
  props<{ client: Client }>()
);

export const updateClientFailure = createAction(
  '[Client] Update Client Failure',
  props<{ error: any }>()
);

export const updateClientLocation = createAction(
  '[Client] Update Client Location',
  props<{ id: string; latitude: number; longitude: number }>()
);

export const updateClientLocationSuccess = createAction(
  '[Client] Update Client Location Success',
  props<{ client: Client }>()
);

export const updateClientLocationFailure = createAction(
  '[Client] Update Client Location Failure',
  props<{ error: any }>()
);

export const updateClientPhotosAndInfo = createAction(
  '[Client] Update Client Photos and Info',
  props<{ clientId: string; cardType: string; cardID: string; profilPhoto: string | null; cardPhoto: string | null; profilPhotoUrl?: string | null; cardPhotoUrl?: string | null; }>()
);

export const updateClientPhotosAndInfoSuccess = createAction(
  '[Client] Update Client Photos and Info Success',
  props<{ client: Client }>()
);

export const updateClientPhotosAndInfoFailure = createAction(
  '[Client] Update Client Photos and Info Failure',
  props<{ error: any }>()
);

// ==================== PAGINATION ACTIONS ====================

export const loadFirstPageClients = createAction(
  '[Client] Load First Page Clients',
  props<{ 
    commercialUsername: string;
    pageSize?: number;
    filters?: {
      searchQuery?: string;
      quarter?: string;
      clientType?: string;
    }
  }>()
);

export const loadFirstPageClientsSuccess = createAction(
  '[Client] Load First Page Clients Success',
  props<{ page: { content: Client[]; totalElements: number; totalPages: number; page: number; size: number } }>()
);

export const loadFirstPageClientsFailure = createAction(
  '[Client] Load First Page Clients Failure',
  props<{ error: any }>()
);

export const loadNextPageClients = createAction(
  '[Client] Load Next Page Clients',
  props<{ 
    commercialUsername: string;
    filters?: {
      searchQuery?: string;
      quarter?: string;
      clientType?: string;
    }
  }>()
);

export const loadNextPageClientsSuccess = createAction(
  '[Client] Load Next Page Clients Success',
  props<{ page: { content: Client[]; totalElements: number; totalPages: number; page: number; size: number } }>()
);

export const loadNextPageClientsFailure = createAction(
  '[Client] Load Next Page Clients Failure',
  props<{ error: any }>()
);

export const resetClientPagination = createAction(
  '[Client] Reset Client Pagination'
);
