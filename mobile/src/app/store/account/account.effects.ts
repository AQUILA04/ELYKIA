import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import * as AccountActions from './account.actions';
import * as ClientActions from '../client/client.actions';
import { AccountService } from '../../core/services/account.service';

@Injectable()
export class AccountEffects {
  constructor(
    private actions$: Actions,
    private accountService: AccountService
  ) { }

  loadAccountByClientId$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AccountActions.loadAccountByClientId),
      switchMap((action) =>
        this.accountService.getAccountByClientId(action.clientId).pipe(
          map((account) => AccountActions.loadAccountByClientIdSuccess({ account })),
          catchError((error) => of(AccountActions.loadAccountByClientIdFailure({ error: error.message })))
        )
      )
    )
  );

  loadAccountsByClientIds$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AccountActions.loadAccountsByClientIds),
      switchMap((action) =>
        this.accountService.getAccountsByClientIds(action.clientIds).pipe(
          map((accounts) => AccountActions.loadAccountsByClientIdsSuccess({ accounts })),
          catchError((error) => of(AccountActions.loadAccountsByClientIdsFailure({ error: error.message })))
        )
      )
    )
  );

  loadAccountsFromClientPages$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ClientActions.loadFirstPageClientsSuccess, ClientActions.loadNextPageClientsSuccess),
      map(action => {
        const clientIds = action.page.content.map(c => c.id);
        return AccountActions.loadAccountsByClientIds({ clientIds });
      })
    )
  );
}
