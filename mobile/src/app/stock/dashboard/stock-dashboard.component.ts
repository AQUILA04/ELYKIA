import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { switchMap, tap, catchError, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { SegmentCustomEvent, ModalController, AlertController, ToastController } from '@ionic/angular';
import { StockDetailModalComponent } from '../components/detail-modal/stock-detail-modal.component';
import { StockStateService, OperationalContext } from '../services/stock-state.service';
import { StockApiService } from '../services/stock-api.service';
import { StockRequest } from '../models/stock-request.model';
import { StockReturn } from '../models/stock-return.model';
import { CreateTontineRequestPayload } from '../models/stock-tontine-request.model';
import { StockTontineRequestFormComponent } from '../components/tontine-request-form/stock-tontine-request-form.component';
import { CreateTontineReturnPayload } from '../models/stock-tontine-return.model';
import { StockTontineReturnFormComponent } from '../components/tontine-return-form/stock-tontine-return-form.component';
import { LoggerService } from '../../core/services/logger.service';

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

  cancellingId: number | null = null;
  currentContext: OperationalContext = 'STANDARD';

  private destroy$ = new Subject<void>();

  constructor(
    private stockStateService: StockStateService,
    private stockApiService: StockApiService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private log: LoggerService
  ) {
    this.context$ = this.stockStateService.context$;
  }

  ngOnInit(): void {
    this.context$.pipe(takeUntil(this.destroy$)).subscribe(ctx => {
      this.currentContext = ctx;
    });

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

  async openCreateTontineRequestForm(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: StockTontineRequestFormComponent,
      componentProps: { isSubmitting: false }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'submit' && data) {
      this.onCreateTontineRequestSubmit(data);
    }
  }

  onCreateTontineRequestSubmit(payload: CreateTontineRequestPayload) {
    this.stockApiService.createTontineRequest(payload).subscribe({
      next: async () => {
        await this.log.log('Tontine stock request created successfully');
        this.stockStateService.setContext('TONTINE'); // Refresh list
      },
      error: async (err: Error) => {
        await this.log.error(`Create tontine request failed: ${err?.message}`);

        const toast = await this.toastCtrl.create({
          message: 'Erreur réseau. Vos données sont préservées. Veuillez réessayer.',
          duration: 4000,
          position: 'bottom',
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async openCreateTontineReturnForm(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: StockTontineReturnFormComponent,
      componentProps: { isSubmitting: false }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'submit' && data) {
      this.onCreateTontineReturnSubmit(data);
    }
  }

  onCreateTontineReturnSubmit(payload: CreateTontineReturnPayload) {
    this.stockApiService.createTontineReturn(payload).subscribe({
      next: async () => {
        await this.log.log('Tontine stock return created successfully');
        this.stockStateService.setContext('TONTINE'); // Refresh list
      },
      error: async (err: Error) => {
        await this.log.error(`Create tontine return failed: ${err?.message}`);

        const toast = await this.toastCtrl.create({
          message: 'Erreur réseau. Vos données sont préservées. Veuillez réessayer.',
          duration: 4000,
          position: 'bottom',
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async onCancelRequestTap(request: StockRequest): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Cancellation',
      message: 'Are you sure you want to cancel this operation? This cannot be undone.',
      buttons: [
        { text: 'Keep', role: 'cancel' },
        {
          text: 'Cancel Operation',
          role: 'destructive',
          handler: () => { this.executeCancelRequest(request); }
        }
      ]
    });
    await alert.present();
  }

  private executeCancelRequest(request: StockRequest): void {
    const prevRequests = [...this.requests];
    this.cancellingId = request.id;
    this.requests = this.requests.filter(r => r.id !== request.id);

    const cancel$ = this.currentContext === 'TONTINE'
      ? this.stockApiService.cancelTontineRequest(request.id)
      : this.stockApiService.cancelStandardRequest(request.id);

    cancel$.subscribe({
      next: async () => {
        await this.log.log(`Request ${request.id} cancelled in ${this.currentContext} context`);
        this.cancellingId = null;
      },
      error: async (err: Error) => {
        this.requests = prevRequests;
        this.cancellingId = null;
        await this.log.log(`Cancel request ${request.id} failed: ${err?.message}`);
        this.showErrorToast();
      }
    });
  }

  async onCancelReturnTap(stockReturn: StockReturn): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Cancellation',
      message: 'Are you sure you want to cancel this operation? This cannot be undone.',
      buttons: [
        { text: 'Keep', role: 'cancel' },
        {
          text: 'Cancel Operation',
          role: 'destructive',
          handler: () => { this.executeCancelReturn(stockReturn); }
        }
      ]
    });
    await alert.present();
  }

  private executeCancelReturn(stockReturn: StockReturn): void {
    const prevReturns = [...this.returns];
    this.cancellingId = stockReturn.id;
    this.returns = this.returns.filter(r => r.id !== stockReturn.id);

    const cancel$ = this.currentContext === 'TONTINE'
      ? this.stockApiService.cancelTontineReturn(stockReturn.id)
      : this.stockApiService.cancelStandardReturn(stockReturn.id);

    cancel$.subscribe({
      next: async () => {
        await this.log.log(`Return ${stockReturn.id} cancelled in ${this.currentContext} context`);
        this.cancellingId = null;
      },
      error: async (err: Error) => {
        this.returns = prevReturns;
        this.cancellingId = null;
        await this.log.log(`Cancel return ${stockReturn.id} failed: ${err?.message}`);
        this.showErrorToast();
      }
    });
  }

  private async showErrorToast() {
    const toast = await this.toastCtrl.create({
      message: 'Network error or server error. Please try again later.',
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }
}

