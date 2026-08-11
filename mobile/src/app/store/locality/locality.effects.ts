import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concat, from, of } from 'rxjs';
import { catchError, concatMap, filter, map, mergeMap, switchMap, withLatestFrom } from 'rxjs/operators';
import { DatabaseService } from 'src/app/core/services/database.service';
import { Store } from '@ngrx/store';
import * as LocalityActions from './locality.actions';
import { LocalityRepositoryExtensions } from 'src/app/core/repositories/locality.repository.extensions';
import { selectLocalityPage, selectLocalitySize } from './locality.selectors';
import { OnlineListRefreshService } from '../../core/services/online-list-refresh.service';
import { Page } from '../../core/repositories/repository.interface';
import { Locality } from '../../models/locality.model';

@Injectable()
export class LocalityEffects {
  loadFirstPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LocalityActions.loadFirstPage),
      switchMap((action) => {
        const pageSize = action.pageSize || 20;
        return from(this.localityRepositoryExtensions.findAllPaginated(0, pageSize, action.filters)).pipe(
          concatMap((localPage) => concat(
            of(LocalityActions.loadLocalitiesSuccess({ page: localPage })),
            from(this.onlineListRefreshService.refreshLocalitiesPage(0, pageSize, action.filters)).pipe(
              filter((serverPage): serverPage is Page<Locality> => !!serverPage),
              map((serverPage) => LocalityActions.loadLocalitiesSuccess({ page: serverPage }))
            )
          )),
          catchError((error) => of(LocalityActions.loadLocalitiesFailure({ error })))
        );
      })
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
    private onlineListRefreshService: OnlineListRefreshService,
    private store: Store
  ) { }
}
