import { Injectable } from '@angular/core';
import { fromEvent, merge, Observable, Subject, timer, of, from as fromPromise } from 'rxjs';
import { switchMap, takeUntil, throttleTime, map } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private stop$ = new Subject<void>();

  constructor(private storage: Storage) {}

  startWatching(): Observable<any> {
    return fromPromise(this.storage.get('autoLock')).pipe(
      switchMap(autoLock => {
        if (!autoLock) {
          return of(); // Return an empty observable if auto-lock is disabled
        }

        return fromPromise(this.storage.get('autoLockDuration')).pipe(
          switchMap(duration => {
            const inactivityDuration = (duration || 2) * 60 * 1000;
            const mouseEvents$ = merge(
              fromEvent(window, 'mousemove'),
              fromEvent(window, 'mousedown'),
              fromEvent(window, 'keydown'),
              fromEvent(window, 'touchstart'),
              fromEvent(window, 'scroll')
            ).pipe(throttleTime(1000));

            return mouseEvents$.pipe(
              switchMap(() => timer(inactivityDuration)),
              takeUntil(this.stop$)
            );
          })
        );
      })
    );
  }

  stopWatching() {
    this.stop$.next();
  }
}