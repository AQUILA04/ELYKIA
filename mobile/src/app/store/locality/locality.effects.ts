import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { DatabaseService } from 'src/app/core/services/database.service';
import { Store } from '@ngrx/store';
import { withLatestFrom } from 'rxjs/operators';
import * as LocalityActions from './locality.actions';
import { LocalityRepositoryExtensions } from 'src/app/core/repositories/locality.repository.extensions';
import { selectLocalityPage, selectLocalitySize } from './locality.selectors';

@Injectable()
export class LocalityEffects {
  loadFirstPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LocalityActions.loadFirstPage),
      mergeMap((action) =>
        from(this.localityRepositoryExtensions.findAllPaginated(0, action.pageSize || 20, action.filters)).pipe(
          map((page) => LocalityActions.loadLocalitiesSuccess({ page })),
          catchError((error) => of(LocalityActions.loadLocalitiesFailure({ error })))
        )
      )
    )
  );

  loadNextPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LocalityActions.loadNextPage),
      withLatestFrom(
        this.store.select(selectLocalityPage),
        this.store.select(selectLocalitySize)
      ),
      mergeMap(([action, currentPage, pageSize]) =>
        from(this.localityRepositoryExtensions.findAllPaginated(currentPage + 1, pageSize, action.filters)).pipe(
          map((page) => LocalityActions.loadLocalitiesSuccess({ page })),
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
    private databaseService: DatabaseService,
    private localityRepositoryExtensions: LocalityRepositoryExtensions,
    private store: Store
  ) { }
}
