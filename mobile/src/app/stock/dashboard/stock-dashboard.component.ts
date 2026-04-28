import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { switchMap, tap, catchError, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { SegmentCustomEvent, ModalController } from '@ionic/angular';
import { StockDetailModalComponent } from '../components/detail-modal/stock-detail-modal.component';
import { StockStateService, OperationalContext } from '../services/stock-state.service';
import { StockApiService } from '../services/stock-api.service';
import { StockRequest } from '../models/stock-request.model';
import { StockReturn } from '../models/stock-return.model';

/** Active content tab on the dashboard. */
export type DashboardTab = 'requests' | 'returns';

@Component({
  selector: 'app-stock-dashboard',
  templateUrl: './stock-dashboard.component.html',
  styleUrls: ['./stock-dashboard.component.scss'],
  standalone: false
})
export class StockDashboardComponent implements OnInit, OnDestroy {
  /** Observable of the current operational context, consumed via async pipe in template. */
  context$: Observable<OperationalContext>;

  /** Currently active content tab. */
  activeTab: DashboardTab = 'requests';

  /** List of stock requests for the active context. */
  requests: StockRequest[] = [];
  /** True while the requests API call is in-flight. */
  loading = false;

  /** List of stock returns for the active context. */
  returns: StockReturn[] = [];
  /** True while the returns API call is in-flight. */
  returnsLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private stockStateService: StockStateService,
    private stockApiService: StockApiService,
    private modalCtrl: ModalController
  ) {
    this.context$ = this.stockStateService.context$;
  }

  ngOnInit(): void {
    // Reset to predictable default state whenever the dashboard is loaded
    this.stockStateService.setContext('STANDARD');

    // React to context switches: show skeleton immediately, then fetch requests endpoint
    this.context$.pipe(
      tap(() => {
        this.loading = true;
        this.requests = [];
      }),
      switchMap((ctx) => {
        console.log('switchMap triggered with ctx', ctx);
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

    // React to context switches: fetch returns endpoint in parallel
    this.context$.pipe(
      tap(() => {
        this.returnsLoading = true;
        this.returns = [];
      }),
      switchMap((ctx) => {
        const ret$ = ctx === 'STANDARD'
          ? this.stockApiService.getStandardReturns()
          : this.stockApiService.getTontineReturns();
        return ret$.pipe(catchError(() => of(null)));
      }),
      takeUntil(this.destroy$)
    ).subscribe((response) => {
      this.returnsLoading = false;
      this.returns = response?.data ?? [];
    });
  }

  /**
   * Handles Ionic segment ionChange events for the operational context.
   * Updates StockStateService with the newly selected context.
   */
  onContextChange(event: any): void {
    console.log('onContextChange called with', event.detail.value);
    const customEvent = event as SegmentCustomEvent;
    if (customEvent.detail.value) {
      const value = customEvent.detail.value as OperationalContext;
      console.log('calling setContext with', value);
      this.stockStateService.setContext(value);
    }
  }

  /**
   * Handles the content tab switch between 'requests' and 'returns'.
   */
  onTabChange(event: any): void {
    const customEvent = event as SegmentCustomEvent;
    if (customEvent.detail.value) {
      this.activeTab = customEvent.detail.value as DashboardTab;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async openDetailModal(operation: StockRequest | StockReturn, type: 'request' | 'return'): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: StockDetailModalComponent,
      componentProps: {
        operation,
        type
      }
    });
    await modal.present();
  }
}

