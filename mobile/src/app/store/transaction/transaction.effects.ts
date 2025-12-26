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
  ) {}

  loadTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TransactionActions.loadTransactions),
      switchMap(() =>
        this.transactionService.initializeTransactions().pipe(
          map((transactions) => TransactionActions.loadTransactionsSuccess({ transactions })),
          catchError((error) => of(TransactionActions.loadTransactionsFailure({ error: error.message })))
        )
      )
    )
  );

  addTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TransactionActions.addTransaction),
      switchMap(({ transaction }) =>
        from(this.transactionService.addTransaction(transaction)).pipe(
          switchMap((addedTransaction) => [
            TransactionActions.addTransactionSuccess({ transaction: addedTransaction }),
            TransactionActions.loadTransactions()
          ]),
          catchError((error) => of(TransactionActions.loadTransactionsFailure({ error: error.message })))
        )
      )
    )
  );
}
