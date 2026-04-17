import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as TransactionActions from './transaction.actions';
import { TransactionService } from '../../core/services/transaction.service';

@Injectable()
export class TransactionEffects {
  constructor(
    private actions$: Actions,
    private transactionService: TransactionService
  ) { }

  loadTransactionsByClient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TransactionActions.loadTransactionsByClient),
      switchMap((action) =>
        this.transactionService.getTransactionsByClientPaginated(action.clientId, action.page, action.size).pipe(
          map((transactions) => TransactionActions.loadTransactionsByClientSuccess({
            transactions,
            page: action.page,
            hasMore: transactions.length === action.size,
            clientId: action.clientId
          })),
          catchError((error) => of(TransactionActions.loadTransactionsByClientFailure({ error: error.message })))
        )
      )
    )
  );

  addTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TransactionActions.addTransaction),
      switchMap(({ transaction }) =>
        from(this.transactionService.addTransaction(transaction)).pipe(
          map((addedTransaction) => TransactionActions.addTransactionSuccess({ transaction: addedTransaction })),
          catchError((error) => of(TransactionActions.loadTransactionsByClientFailure({ error: error.message })))
        )
      )
    )
  );
}
