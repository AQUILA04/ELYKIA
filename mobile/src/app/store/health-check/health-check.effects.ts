import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { interval, merge } from 'rxjs';
import { switchMap, map, startWith } from 'rxjs/operators';
import * as HealthCheckActions from './health-check.actions';
import * as AuthActions from '../auth/auth.actions';
import { HealthCheckService } from '../../core/services/health-check.service';

@Injectable()
export class HealthCheckEffects {
  constructor(
    private actions$: Actions,
    private healthCheckService: HealthCheckService
  ) {}

  checkOnlineStatus$ = createEffect(() =>
    merge(
      interval(10800000).pipe(startWith(0)), // Ping every 3 hours, and immediately on startup
      this.actions$.pipe(ofType(HealthCheckActions.checkOnlineStatus)) // Also trigger on explicit action
    ).pipe(
      switchMap(() =>
        this.healthCheckService.pingBackend().pipe(
          map((isOnline) => HealthCheckActions.setOnlineStatus({ isOnline }))
        )
      )
    )
  );

  // New effect: Trigger health check after successful logout
  triggerHealthCheckAfterLogout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logoutSuccess),
      map(() => HealthCheckActions.checkOnlineStatus())
    )
  );
}
