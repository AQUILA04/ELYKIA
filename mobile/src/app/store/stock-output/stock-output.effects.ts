import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import * as StockOutputActions from './stock-output.actions';
import { StockOutputService } from '../../core/services/stock-output.service';

@Injectable()
export class StockOutputEffects {
  constructor(
    private actions$: Actions,
    private stockOutputService: StockOutputService
  ) {}

  loadStockOutputs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StockOutputActions.loadStockOutputs),
      switchMap((action) =>
        this.stockOutputService.getStockOutputsByCommercialUsername(action.commercialUsername).pipe(
          map((stockOutputs) => StockOutputActions.loadStockOutputsSuccess({ stockOutputs })),
          catchError((error) => of(StockOutputActions.loadStockOutputsFailure({ error: error.message })))
        )
      )
    )
  );
}
