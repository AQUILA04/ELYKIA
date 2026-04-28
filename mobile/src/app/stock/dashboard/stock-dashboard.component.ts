import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { switchMap, tap, catchError, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { SegmentCustomEvent } from '@ionic/angular';
import { StockStateService, OperationalContext } from '../services/stock-state.service';
import { StockApiService } from '../services/stock-api.service';
import { StockRequest } from '../models/stock-request.model';

@Component({
  selector: 'app-stock-dashboard',
  templateUrl: './stock-dashboard.component.html',
  styleUrls: ['./stock-dashboard.component.scss'],
  standalone: false
})
export class StockDashboardComponent implements OnInit, OnDestroy {
  /** Observable of the current operational context, consumed via async pipe in template. */
  context$: Observable<OperationalContext>;

  /** List of stock requests for the active context. */
  requests: StockRequest[] = [];

  /** True while the API call is in-flight — triggers the skeleton loader. */
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private stockStateService: StockStateService,
    private stockApiService: StockApiService
  ) {
    this.context$ = this.stockStateService.context$;
  }

  ngOnInit(): void {
    // Reset to predictable default state whenever the dashboard is loaded
    this.stockStateService.setContext('STANDARD');

    // React to context switches: show skeleton immediately, then fetch the correct endpoint
    this.context$.pipe(
      tap(() => {
        this.loading = true;
        this.requests = [];
      }),
      switchMap((ctx) => {
        const req$ = ctx === 'STANDARD'
          ? this.stockApiService.getStandardRequests()
          : this.stockApiService.getTontineRequests();
        return req$.pipe(catchError(() => of(null)));
      }),
      takeUntil(this.destroy$)
    ).subscribe((response) => {
      this.loading = false;
      this.requests = response?.data ?? [];
    });
  }

  /**
   * Handles Ionic segment ionChange events.
   * Updates StockStateService with the newly selected context.
   */
  onContextChange(event: any): void {
    const customEvent = event as SegmentCustomEvent;
    if (customEvent.detail.value) {
      const value = customEvent.detail.value as OperationalContext;
      this.stockStateService.setContext(value);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
