import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import * as AccountActions from './account.actions';
import { AccountService } from '../../core/services/account.service';

@Injectable()
export class AccountEffects {
  constructor(
    private actions$: Actions,
    private accountService: AccountService
  ) {}

  loadAccounts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AccountActions.loadAccounts),
      switchMap(() =>
        this.accountService.getAccountFromDB().pipe(
          map((accounts) => AccountActions.loadAccountsSuccess({ accounts })),
          catchError((error) => of(AccountActions.loadAccountsFailure({ error: error.message })))
        )
      )
    )
  );
}
