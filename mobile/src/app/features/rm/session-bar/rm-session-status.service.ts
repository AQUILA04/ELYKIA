import { Injectable, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Subscription, fromEvent, merge, interval } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { selectIsOnline } from '../../../store/health-check/health-check.selectors';
import * as HealthCheckActions from '../../../store/health-check/health-check.actions';

export interface RmSessionSnapshot {
  username: string;
  isOnline: boolean;
}

@Injectable({ providedIn: 'root' })
export class RmSessionStatusService implements OnDestroy {
  private readonly snapshotSubject = new BehaviorSubject<RmSessionSnapshot>({
    username: '—',
    isOnline: false
  });
  readonly snapshot$ = this.snapshotSubject.asObservable();

  private started = false;
  private refreshing = false;
  private refs = 0;
  private subs: Subscription[] = [];

  constructor(
    private readonly auth: AuthService,
    private readonly connectivity: ConnectivityService,
    private readonly store: Store
  ) {}

  /** Acquire a shared session monitor (ref-counted). */
  acquire(): void {
    this.refs += 1;
    this.ensureStarted();
  }

  release(): void {
    this.refs = Math.max(0, this.refs - 1);
    if (this.refs === 0) {
      this.stop();
    }
  }

  getSnapshot(): RmSessionSnapshot {
    return this.snapshotSubject.value;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private ensureStarted(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.patch({ username: this.auth.currentUser?.username || '—' });

    this.subs.push(
      this.store.select(selectIsOnline).subscribe(online => {
        this.patch({ isOnline: !!online });
      })
    );

    void this.refreshConnectivity(true);

    this.subs.push(
      merge(
        interval(30_000),
        fromEvent(window, 'online'),
        fromEvent(window, 'offline')
      ).subscribe(() => {
        void this.refreshConnectivity(true);
      })
    );
  }

  private stop(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.started = false;
  }

  private patch(partial: Partial<RmSessionSnapshot>): void {
    this.snapshotSubject.next({ ...this.snapshotSubject.value, ...partial });
  }

  private async refreshConnectivity(force = false): Promise<void> {
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.patch({ isOnline: false });
        this.store.dispatch(HealthCheckActions.setOnlineStatus({ isOnline: false }));
        return;
      }
      const reachable = await this.connectivity.checkBackendReachable(force);
      this.patch({ isOnline: reachable });
      this.store.dispatch(HealthCheckActions.setOnlineStatus({ isOnline: reachable }));
    } finally {
      this.refreshing = false;
    }
  }
}
