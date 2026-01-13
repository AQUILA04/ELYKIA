import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import * as CommercialStockActions from './commercial-stock.actions';
import { CommercialStockService } from '../../core/services/commercial-stock.service';

@Injectable()
export class CommercialStockEffects {
  constructor(
    private actions$: Actions,
    private commercialStockService: CommercialStockService
  ) {}

  loadCommercialStock$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CommercialStockActions.loadCommercialStock),
      switchMap((action) =>
        this.commercialStockService.getCommercialStock(action.commercialUsername).pipe(
          map((stockItems) => CommercialStockActions.loadCommercialStockSuccess({ stockItems })),
          catchError((error) => of(CommercialStockActions.loadCommercialStockFailure({ error: error.message })))
        )
      )
    )
  );

  updateStockQuantity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CommercialStockActions.updateStockQuantity),
      switchMap((action) =>
        this.commercialStockService.updateStockQuantity(action.articleId, action.newQuantity).pipe(
          map(() => CommercialStockActions.updateStockQuantitySuccess({ 
            articleId: action.articleId, 
            newQuantity: action.newQuantity 
          })),
          catchError((error) => of(CommercialStockActions.updateStockQuantityFailure({ error: error.message })))
        )
      )
    )
  );
}