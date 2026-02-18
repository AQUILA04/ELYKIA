import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, from } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, take } from 'rxjs/operators';
import * as ClientActions from './client.actions';
import { ClientService } from '../../core/services/client.service';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../auth/auth.selectors';
import { Client } from '../../models/client.model';
import * as AccountActions from '../account/account.actions';

import { selectAllClients, selectClientById } from './client.selectors';
import { deleteDistributionsByClient } from "../distribution/distribution.actions";

@Injectable()
export class ClientEffects {
  constructor(
    private actions$: Actions,
    private clientService: ClientService,
    private store: Store
  ) { }

  loadClients$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.loadClients),
      switchMap((action) =>
        this.clientService.getClients().pipe(
          map((clients) => ClientActions.loadClientsSuccess({ clients })),
          catchError((error) => of(ClientActions.loadClientsFailure({ error: error.message })))
        )
      )
    )
  );

  addClient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.addClient),
      switchMap(action =>
        from(this.clientService.createClientLocally(action.client, action.commercialUsername)).pipe(
          switchMap(({ client, account }) => [
            ClientActions.addClientSuccess({ client }),
            AccountActions.addAccountSuccess({ account }),
            ClientActions.loadClientViewsUpdate()
          ]),
          catchError(error => of(ClientActions.addClientFailure({ error })))
        )
      )
    )
  );

  updateClientCreditStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClientCreditStatus),
      switchMap(action =>
        from(this.clientService.updateClientCreditStatus(action.clientId, action.creditInProgress)).pipe(
          map(() => ClientActions.loadClientViewsUpdate()),
          catchError(error => of(ClientActions.loadClientsFailure({ error })))
        )
      )
    )
  );

  deleteClient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.deleteClient),
      withLatestFrom(this.store.select(selectAllClients)),
      switchMap(([action, clients]) => {
        const clientToDelete = clients.find(c => c.id === action.id);
        if (!clientToDelete) {
          return of(ClientActions.deleteClientFailure({ error: 'Client not found' }));
        }
        if (!clientToDelete.isLocal) {
          return of(ClientActions.deleteClientFailure({ error: 'Cannot delete a synced client' }));
        }

        return from(this.clientService.deleteClient(action.id)).pipe(
          map(() => ClientActions.deleteClientSuccess({ id: action.id })),
          catchError(error => of(ClientActions.deleteClientFailure({ error })))
        );
      })
    )
  );

  updateClient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClient),
      switchMap(action =>
        from(this.clientService.updateClient(action.client)).pipe(
          map(client => ClientActions.updateClientSuccess({ client })),
          catchError(error => of(ClientActions.updateClientFailure({ error })))
        )
      )
    )
  );

  loadClientViewsUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.loadClientViewsUpdate),
      withLatestFrom(this.store.select(selectAuthUser)),
      switchMap(([action, user]) => {
        if (!user) {
          return of(ClientActions.loadClientsFailure({ error: 'User not authenticated' }));
        }
        return [
          ClientActions.loadClients({ commercialUsername: user.username }),
          AccountActions.loadAccounts()
        ];
      })
    )
  );

  updateClientBalance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClientBalance),
      switchMap(action =>
        from(this.clientService.updateClientBalance(action.clientId, action.balance)).pipe(
          switchMap((account) => [
            AccountActions.updateAccountSuccess({ account }),
            ClientActions.loadClientViewsUpdate(),
          ]),
          catchError(error => of(ClientActions.updateClientBalanceFailure({ error })))
        )
      )
    )
  );

  updateClientLocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClientLocation),
      switchMap(action =>
        from(this.clientService.updateClientLocation(action.id, action.latitude, action.longitude)).pipe(
          map(client => ClientActions.updateClientLocationSuccess({ client })),
          catchError(error => of(ClientActions.updateClientLocationFailure({ error })))
        )
      )
    )
  );

  updateClientPhotosAndInfo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClientPhotosAndInfo),
      switchMap(action =>
        from(this.clientService.updateClientPhotosAndInfo(action)).pipe(
          map(client => ClientActions.updateClientPhotosAndInfoSuccess({ client })),
          catchError(error => of(ClientActions.updateClientPhotosAndInfoFailure({ error })))
        )
      )
    )
  );



  // ==================== PAGINATION EFFECTS ====================

  loadFirstPageClients$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.loadFirstPageClients),
      switchMap((action) => {
        if (!action.commercialUsername) {
          return of(ClientActions.loadFirstPageClientsFailure({
            error: 'commercialUsername is required for security'
          }));
        }

        return from(
          this.clientService.getClientsPaginated(
            action.commercialUsername,
            0, // First page
            action.pageSize || 20,
            action.filters
          )
        ).pipe(
          map((page) => ClientActions.loadFirstPageClientsSuccess({ page })),
          catchError((error) => of(ClientActions.loadFirstPageClientsFailure({ error: error.message })))
        );
      })
    )
  );

  loadNextPageClients$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.loadNextPageClients),
      withLatestFrom(this.store.select(state => (state as any).client?.pagination)),
      switchMap(([action, pagination]) => {
        if (!action.commercialUsername) {
          return of(ClientActions.loadNextPageClientsFailure({
            error: 'commercialUsername is required for security'
          }));
        }

        if (!pagination || !pagination.hasMore || pagination.loading) {
          // No more pages to load or already loading
          return of({ type: 'NO_OP' });
        }

        const nextPage = pagination.currentPage + 1;

        return from(
          this.clientService.getClientsPaginated(
            action.commercialUsername,
            nextPage,
            pagination.pageSize,
            action.filters
          )
        ).pipe(
          map((page) => ClientActions.loadNextPageClientsSuccess({ page })),
          catchError((error) => of(ClientActions.loadNextPageClientsFailure({ error: error.message })))
        );
      })
    )
  );
}
