import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import * as CommercialActions from './commercial.actions';
import { CommercialService } from '../../core/services/commercial.service';

@Injectable()
export class CommercialEffects {
  constructor(
    private actions$: Actions,
    private commercialService: CommercialService
  ) {}

  loadCommercial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CommercialActions.loadCommercial),
      switchMap((action) =>
        this.commercialService.getCommercials().pipe(
          map((commercial) => CommercialActions.loadCommercialSuccess({ commercial })),
          catchError((error) => of(CommercialActions.loadCommercialFailure({ error: error.message })))
        )
      )
    )
  );
}
