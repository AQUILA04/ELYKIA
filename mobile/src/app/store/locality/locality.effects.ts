import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { DatabaseService } from 'src/app/core/services/database.service';
import * as LocalityActions from './locality.actions';

@Injectable()
export class LocalityEffects {
  loadLocalities$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LocalityActions.loadLocalities),
      mergeMap(() =>
        from(this.databaseService.getLocalities()).pipe(
          map((localities) => LocalityActions.loadLocalitiesSuccess({ localities })),
          catchError((error) => of(LocalityActions.loadLocalitiesFailure({ error })))
        )
      )
    )
  );

  addLocality$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LocalityActions.addLocality),
      mergeMap((action) =>
        from(this.databaseService.addLocality(action.locality)).pipe(
          map((locality) => LocalityActions.addLocalitySuccess({ locality })),
          catchError((error) => of(LocalityActions.addLocalityFailure({ error })))
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private databaseService: DatabaseService
  ) {}
}
