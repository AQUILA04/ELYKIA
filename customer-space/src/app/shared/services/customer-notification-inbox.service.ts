import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, catchError, of, switchMap, timer } from 'rxjs';
import { CustomerApiService } from './customer-api.service';
import { CustomerSessionService } from './customer-session.service';

const POLL_MS = 60_000;

/**
 * Badge non-lus du centre de notifications client.
 * Polling léger + refresh manuel après consultation.
 */
@Injectable({ providedIn: 'root' })
export class CustomerNotificationInboxService implements OnDestroy {
  private readonly unreadSubject = new BehaviorSubject<number>(0);
  private pollSub: Subscription | null = null;

  readonly unreadCount$: Observable<number> = this.unreadSubject.asObservable();

  constructor(
    private api: CustomerApiService,
    private session: CustomerSessionService,
  ) {
    this.pollSub = this.session.session$.pipe(
      switchMap((s) => {
        if (!s?.isAuthenticated) {
          this.unreadSubject.next(0);
          return of(0);
        }
        return timer(0, POLL_MS).pipe(
          switchMap(() =>
            this.api.getUnreadNotificationCount().pipe(
              catchError(() => of({ count: 0 })),
            ),
          ),
        );
      }),
    ).subscribe((res) => {
      if (typeof res === 'number') {
        this.unreadSubject.next(res);
      } else {
        this.unreadSubject.next(res.count ?? 0);
      }
    });
  }

  get unreadCount(): number {
    return this.unreadSubject.getValue();
  }

  refresh(): void {
    if (!this.session.isAuthenticated) {
      this.unreadSubject.next(0);
      return;
    }
    this.api.getUnreadNotificationCount().pipe(
      catchError(() => of({ count: 0 })),
    ).subscribe((res) => this.unreadSubject.next(res.count ?? 0));
  }

  setUnreadCount(count: number): void {
    this.unreadSubject.next(Math.max(0, count));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
