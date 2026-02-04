import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError, tap } from 'rxjs/operators';
import * as CommercialStockActions from './commercial-stock.actions';
import { CommercialStockService } from '../../core/services/commercial-stock.service';
import { LoggerService } from '../../core/services/logger.service';

@Injectable()
export class CommercialStockEffects {

  loadCommercialStock$ = createEffect(() => this.actions$.pipe(
    ofType(CommercialStockActions.loadCommercialStock),
    mergeMap(action => this.commercialStockService.getAvailableStock(action.commercialUsername)
      .pipe(
        map(stockItems => CommercialStockActions.loadCommercialStockSuccess({ stockItems })),
        catchError(error => {
            this.log.error('Error loading commercial stock', error);
            return of(CommercialStockActions.loadCommercialStockFailure({ error }));
        })
      ))
  ));

  syncCommercialStock$ = createEffect(() => this.actions$.pipe(
    ofType(CommercialStockActions.syncCommercialStock),
    mergeMap(action => this.commercialStockService.syncCommercialStock(action.commercialUsername)
      .pipe(
        map(stockItems => CommercialStockActions.syncCommercialStockSuccess({ stockItems })),
        catchError(error => {
            this.log.error('Error syncing commercial stock', error);
            return of(CommercialStockActions.syncCommercialStockFailure({ error }));
        })
      ))
  ));

  constructor(
    private actions$: Actions,
    private commercialStockService: CommercialStockService,
    private log: LoggerService
  ) {}
}
