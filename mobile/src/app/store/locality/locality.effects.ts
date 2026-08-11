import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concat, from, of } from 'rxjs';
import { catchError, concatMap, filter, map, mergeMap, switchMap, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import * as LocalityActions from './locality.actions';
import { LocalityRepositoryExtensions } from 'src/app/core/repositories/locality.repository.extensions';
import { selectLocalityPage, selectLocalitySize } from './locality.selectors';
import { OnlineListRefreshService } from '../../core/services/online-list-refresh.service';
import { LocalityService } from '../../core/services/locality.service';
import { HybridSyncUiService } from '../../core/services/hybrid-sync-ui.service';
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
      concatMap((action) =>
        this.localityService.addLocality(action.locality.name, action.forceOffline).pipe(
          map((locality) => LocalityActions.addLocalitySuccess({ locality })),
          catchError((error) =>
            from(this.handleCreateWriteError(error, () =>
              LocalityActions.addLocality({
                locality: action.locality,
                forceOffline: true
              })
            ))
          )
        )
      )
    )
  );

  private async handleCreateWriteError(
    error: unknown,
    retryOfflineAction: () => ReturnType<typeof LocalityActions.addLocality>
  ) {
    if (this.hybridSyncUiService.isOnlineWriteBusinessError(error)) {
      const saveOffline = await this.hybridSyncUiService.promptOfflineFallback(error.message);
      if (saveOffline) {
        return retryOfflineAction();
      }
    }
    return LocalityActions.addLocalityFailure({
      error: error instanceof Error ? error.message : String(error)
    });
  }

  constructor(
    private actions$: Actions,
    private localityService: LocalityService,
    private localityRepositoryExtensions: LocalityRepositoryExtensions,
    private onlineListRefreshService: OnlineListRefreshService,
    private hybridSyncUiService: HybridSyncUiService,
    private store: Store
  ) { }
}
