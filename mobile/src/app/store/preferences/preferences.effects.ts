import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SyncDateFilterPreferenceService } from '../../core/services/sync-date-filter-preference.service';
import * as PreferencesActions from './preferences.actions';

@Injectable()
export class PreferencesEffects {
  init$ = createEffect(() =>
    of(PreferencesActions.loadSyncDateFilterPreference())
  );

  loadSyncDateFilterPreference$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PreferencesActions.loadSyncDateFilterPreference),
      switchMap(() =>
        from(this.prefService.loadFilter()).pipe(
          map((filter) => PreferencesActions.loadSyncDateFilterPreferenceSuccess({ filter })),
          catchError(() => of(PreferencesActions.loadSyncDateFilterPreferenceSuccess({ filter: 'today' })))
        )
      )
    )
  );

  setSyncDateFilter$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PreferencesActions.setSyncDateFilter),
      switchMap(({ filter }) =>
        from(this.prefService.saveFilter(filter)).pipe(
          map(() => PreferencesActions.setSyncDateFilterSuccess({ filter })),
          catchError(() => of(PreferencesActions.setSyncDateFilterSuccess({ filter })))
        )
      )
    )
  );

  constructor(
    private readonly actions$: Actions,
    private readonly prefService: SyncDateFilterPreferenceService
  ) {}
}
