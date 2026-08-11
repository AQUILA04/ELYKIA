import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concat, from, of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, take, concatMap, filter } from 'rxjs/operators';
import * as ClientActions from './client.actions';
import { ClientService } from '../../core/services/client.service';
import { Store, Action } from '@ngrx/store';
import { selectAuthUser } from '../auth/auth.selectors';
import { Client } from '../../models/client.model';
import * as AccountActions from '../account/account.actions';
import { OnlineListRefreshService } from '../../core/services/online-list-refresh.service';
import { HybridSyncUiService } from '../../core/services/hybrid-sync-ui.service';
import { Page } from '../../core/repositories/repository.interface';

// Import the selectors properly
import { selectClientById } from './client.selectors';

@Injectable()
export class ClientEffects {
  constructor(
    private actions$: Actions,
    private clientService: ClientService,
    private store: Store,
    private onlineListRefreshService: OnlineListRefreshService,
    private hybridSyncUiService: HybridSyncUiService
  ) { }


  addClient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.addClient),
      concatMap((action) =>
        from(this.clientService.createClientLocally(action.client, action.commercialUsername, action.forceOffline)).pipe(
          switchMap(({ client, account }) => [
            ClientActions.addClientSuccess({ client }),
            AccountActions.addAccountSuccess({ account }),
          ]),
          catchError((error) =>
            from(this.handleCreateWriteError(error, () =>
              ClientActions.addClient({
                client: action.client,
                commercialUsername: action.commercialUsername,
                forceOffline: true
              })
            ))
          )
        )
      )
    )
  );

  private async handleCreateWriteError(
    error: unknown,
    retryOfflineAction: () => ReturnType<typeof ClientActions.addClient>
  ) {
    if (this.hybridSyncUiService.isOnlineWriteBusinessError(error)) {
      const saveOffline = await this.hybridSyncUiService.promptOfflineFallback(error.message);
      if (saveOffline) {
        return retryOfflineAction();
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    return ClientActions.addClientFailure({ error: message });
  }

  private async handleBusinessWriteError(
    error: unknown,
    retryOfflineAction: () => Action,
    failureAction: (message: string) => Action
  ): Promise<Action> {
    if (this.hybridSyncUiService.isOnlineWriteBusinessError(error)) {
      const saveOffline = await this.hybridSyncUiService.promptOfflineFallback(error.message);
      if (saveOffline) {
        return retryOfflineAction();
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    return failureAction(message);
  }

  updateClientCreditStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClientCreditStatus),
      switchMap(action =>
        from(this.clientService.updateClientCreditStatus(action.clientId, action.creditInProgress)).pipe(
          // Optimistically update the client in the store via a specific action if needed,
          // or just rely on the fact that the service updated the DB.
          // For now, we might need to reload the specific client or just dispatch a success action that updates the entity.
          // Since we don't have a specific "UpdateCreditStatusSuccess" that carries the client, we might need to fetch it or construct it.
          // Ideally, updateClientCreditStatus returns the updated client.
          switchMap(() => {
            return from(this.clientService.getClientById(action.clientId)).pipe(
              map(client => ClientActions.updateClientSuccess({ client }))
            );
          }),
          catchError(error => of(ClientActions.updateClientFailure({ error })))
        )
      )
    )
  );

  deleteClient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.deleteClient),
      // We can use selectClientById instead of selectAllClients to be more efficient
      switchMap((action) =>
        this.store.select(selectClientById(action.id)).pipe(
          take(1),
          switchMap(clientToDelete => {
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
      )
    )
  );

  updateClient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClient),
      concatMap((action) =>
        from(this.clientService.updateClient(action.client, action.forceOffline)).pipe(
          map(client => ClientActions.updateClientSuccess({ client })),
          catchError((error) =>
            from(this.handleBusinessWriteError(
              error,
              () => ClientActions.updateClient({ client: action.client, forceOffline: true }),
              (message) => ClientActions.updateClientFailure({ error: message })
            ))
          )
        )
      )
    )
  );

  /**
   * Legacy `loadClients` → relecture paginée SQLite (1ʳᵉ page).
   * Remplace l’ancien chargement complet en mémoire, désormais sans effet dédié.
   */
  loadClients$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.loadClients),
      map((action) => {
        if (!action.commercialUsername) {
          return ClientActions.loadFirstPageClientsFailure({
            error: 'commercialUsername is required for security'
          });
        }
        return ClientActions.loadFirstPageClients({
          commercialUsername: action.commercialUsername,
        });
      })
    )
  );

  /**
   * @deprecated Prefer specific update actions or loadFirstPageClients.
   */
  loadClientViewsUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.loadClientViewsUpdate),
      withLatestFrom(this.store.select(selectAuthUser)),
      switchMap(([, user]) => {
        if (!user) {
          return of(ClientActions.loadClientsFailure({ error: 'User not authenticated' }));
        }
        return [
          ClientActions.loadFirstPageClients({ commercialUsername: user.username })
        ];
      })
    )
  );

  updateClientBalance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClientBalance),
      concatMap((action) =>
        from(this.clientService.updateClientBalance(action.clientId, action.balance, action.forceOffline)).pipe(
          switchMap((account) => [
            AccountActions.updateAccountSuccess({ account }),
          ]),
          catchError((error) =>
            from(this.handleBusinessWriteError(
              error,
              () => ClientActions.updateClientBalance({
                clientId: action.clientId,
                balance: action.balance,
                forceOffline: true
              }),
              (message) => ClientActions.updateClientBalanceFailure({ error: message })
            ))
          )
        )
      )
    )
  );

  updateClientLocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClientLocation),
      concatMap((action) =>
        from(this.clientService.updateClientLocation(
          action.id,
          action.latitude,
          action.longitude,
          action.forceOffline
        )).pipe(
          map(client => ClientActions.updateClientLocationSuccess({ client })),
          catchError((error) =>
            from(this.handleBusinessWriteError(
              error,
              () => ClientActions.updateClientLocation({
                id: action.id,
                latitude: action.latitude,
                longitude: action.longitude,
                forceOffline: true
              }),
              (message) => ClientActions.updateClientLocationFailure({ error: message })
            ))
          )
        )
      )
    )
  );

  updateClientPhotosAndInfo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.updateClientPhotosAndInfo),
      concatMap((action) =>
        from(this.clientService.updateClientPhotosAndInfo(action, action.forceOffline)).pipe(
          map(client => ClientActions.updateClientPhotosAndInfoSuccess({ client })),
          catchError((error) =>
            from(this.handleBusinessWriteError(
              error,
              () => ClientActions.updateClientPhotosAndInfo({ ...action, forceOffline: true }),
              (message) => ClientActions.updateClientPhotosAndInfoFailure({ error: message })
            ))
          )
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

        const pageSize = action.pageSize || 20;

        return from(
          this.clientService.getClientsPaginated(
            action.commercialUsername,
            0,
            pageSize,
            action.filters
          )
        ).pipe(
          concatMap((localPage) => concat(
            of(ClientActions.loadFirstPageClientsSuccess({ page: localPage })),
            from(this.onlineListRefreshService.refreshClientsPage(
              action.commercialUsername,
              0,
              pageSize,
              action.filters
            )).pipe(
              filter((serverPage): serverPage is Page<any> => !!serverPage),
              map((serverPage) => ClientActions.loadFirstPageClientsSuccess({ page: serverPage }))
            )
          )),
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

        if (!pagination || !pagination.hasMore) {
          // No more pages to load
          return of(ClientActions.loadNextPageClientsFailure({ error: 'No more pages to load' }));
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
          concatMap((localPage) => concat(
            of(ClientActions.loadNextPageClientsSuccess({ page: localPage })),
            from(this.onlineListRefreshService.refreshClientsPage(
              action.commercialUsername,
              nextPage,
              pagination.pageSize,
              action.filters
            )).pipe(
              filter((serverPage): serverPage is Page<any> => !!serverPage),
              map((serverPage) => ClientActions.loadNextPageClientsSuccess({ page: serverPage }))
            )
          )),
          catchError((error) => of(ClientActions.loadNextPageClientsFailure({ error: error.message })))
        );
      })
    )
  );
}
