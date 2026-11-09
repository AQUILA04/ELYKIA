import { Injectable, OnDestroy, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, interval, of } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Clients are never a privileged profile: unit prices show only when the
 * application parameter is off. The value is read at startup and kept for 6 hours.
 */
@Injectable({ providedIn: 'root' })
export class UnitPriceVisibilityService implements OnDestroy {
  static readonly KEY = 'RESTRICT_UNIT_PRICE_VISIBILITY';
  private static readonly TTL_MS = 6 * 60 * 60 * 1000;

  private readonly showSubject = new BehaviorSubject<boolean>(false);
  readonly showUnitPrice$: Observable<boolean> = this.showSubject.asObservable();

  private restricted = true;
  private loadedAt = 0;
  private inFlight: Observable<boolean> | null = null;
  private readonly refreshSub?: Subscription;

  constructor(@Optional() private http: HttpClient | null) {
    if (!this.http) {
      return;
    }
    this.refreshSub = interval(UnitPriceVisibilityService.TTL_MS).subscribe(() => this.refresh(true).subscribe());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  ensureLoaded(): Observable<boolean> {
    return this.refresh(false);
  }

  refresh(force: boolean): Observable<boolean> {
    if (!force && this.loadedAt && Date.now() - this.loadedAt < UnitPriceVisibilityService.TTL_MS) {
      return of(this.showSubject.value);
    }
    if (!this.http) {
      return of(this.showSubject.value);
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = this.http
      .get<boolean>(`${environment.apiUrl}/api/parameters/enabled/${UnitPriceVisibilityService.KEY}`)
      .pipe(
        tap(enabled => {
          this.restricted = enabled === true;
          this.loadedAt = Date.now();
          this.publish();
        }),
        catchError(() => of(this.restricted)),
        finalize(() => { this.inFlight = null; }),
        shareReplay(1)
      );
    return this.inFlight;
  }

  get snapshot(): boolean {
    return this.showSubject.value;
  }

  private publish(): void {
    this.showSubject.next(!this.restricted);
  }
}
