import { Component, OnDestroy, OnInit, Type } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { Router } from '@angular/router';
import { Observable, Subject, of, switchMap, tap, catchError, takeUntil } from 'rxjs';
import { StockPage } from '../models/stock-page.model';
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
import { CreateStockRequestPayload } from '../models/stock-request.model';
import { StockRequestFormComponent } from '../components/request-form/stock-request-form.component';
import { CreateStockReturnPayload } from '../models/stock-return.model';
import { StockReturnFormComponent } from '../components/return-form/stock-return-form.component';
import { LoggerService } from '../../../core/services/logger.service';

/** Active content tab on the dashboard. */
export type DashboardTab = 'requests' | 'returns';

@Component({
  selector: 'app-stock-dashboard',
  templateUrl: './stock-dashboard.component.html',
  styleUrls: ['./stock-dashboard.component.scss'],
  standalone: false
})
export class StockDashboardComponent implements OnInit, OnDestroy, ViewWillEnter {
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

  /** ── Search & Filters ── */
  searchQuery: string = '';
  activeFilter: string = 'ALL';

  get statusFilters() {
    if (this.activeTab === 'returns') {
      return [
        { label: 'Toutes', value: 'ALL' },
        { label: 'Créée', value: 'CREATED' },
        { label: 'Réceptionnée', value: 'RECEIVED' },
        { label: 'Annulée', value: 'CANCELLED' } // Ajouté comme optionnel suite à la traduction demandée
      ];
    }
    return [
      { label: 'Toutes', value: 'ALL' },
      { label: 'En attente', value: 'CREATED' },
      { label: 'Validées', value: 'VALIDATED' },
      { label: 'Livrées', value: 'DELIVERED' },
      { label: 'Annulées', value: 'CANCELLED' },
      { label: 'Refusées', value: 'REFUSED' }
    ];
  }

  private destroy$ = new Subject<void>();

  constructor(
    private stockStateService: StockStateService,
    private stockApiService: StockApiService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private log: LoggerService,
    private router: Router
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
        const req$ = (ctx === 'STANDARD'
          ? this.stockApiService.getStandardRequests()
          : this.stockApiService.getTontineRequests()) as Observable<StockPage<StockRequest>>;
        return req$.pipe(catchError(() => of(this.emptyStockPage<StockRequest>())));
      }),
      takeUntil(this.destroy$)
    ).subscribe((response) => {
      this.loading = false;
      this.requests = response?.content ?? [];
    });

    // React to context switches: fetch returns endpoint in parallel
    this.context$.pipe(
      tap(() => {
        this.returnsLoading = true;
        this.returns = [];
      }),
      switchMap((ctx) => {
        const ret$ = (ctx === 'STANDARD'
          ? this.stockApiService.getStandardReturns()
          : this.stockApiService.getTontineReturns()) as Observable<StockPage<StockReturn>>;
        return ret$.pipe(catchError(() => of(this.emptyStockPage<StockReturn>())));
      }),
      takeUntil(this.destroy$)
    ).subscribe((response) => {
      this.returnsLoading = false;
      this.returns = response?.content ?? [];
    });
  }

  // ── Filters & Search ──────────────────────────────────────────────────

  get filteredRequests(): StockRequest[] {
    return this.requests.filter(req => this.matchItem(req));
  }

  get filteredReturns(): StockReturn[] {
    return this.returns.filter(ret => this.matchItem(ret));
  }

  private matchItem(item: StockRequest | StockReturn): boolean {
    const q = this.searchQuery.toLowerCase();
    const matchSearch = !q ||
      item.reference?.toLowerCase().includes(q) ||
      item.id.toString().includes(q);

    let matchFilter = true;
    if (this.activeFilter !== 'ALL') {
      const status = item.status?.toUpperCase() || '';
      if (this.activeFilter === 'CREATED') {
        matchFilter = status === 'CREATED' || status === 'PENDING';
      } else if (this.activeFilter === 'VALIDATED') {
        matchFilter = status === 'VALIDATED' || status === 'APPROVED';
      } else {
        matchFilter = status === this.activeFilter;
      }
    }

    return matchSearch && matchFilter;
  }

  setFilter(filterValue: string): void {
    this.activeFilter = filterValue;
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

  /** Handles context switch from custom pill buttons (premium UI). */
  switchContext(ctx: OperationalContext): void {
    this.stockStateService.setContext(ctx);
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

  /** Handles tab switch from custom bottom tab bar buttons (premium UI). */
  switchTab(tab: DashboardTab): void {
    this.activeTab = tab;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private emptyStockPage<T>(): StockPage<T> {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 0,
      number: 0,
      first: true,
      last: true,
      empty: true,
      numberOfElements: 0
    };
  }

  ionViewWillEnter(): void {
    this.refreshLists();
  }

  onRequestTap(request: StockRequest): void {
    const base = this.currentContext === 'TONTINE' ? '/tabs/stock/tontine/requests' : '/tabs/stock/requests';
    this.router.navigate([base, request.id], { state: { operation: request } });
  }

  onReturnTap(stockReturn: StockReturn): void {
    const base = this.currentContext === 'TONTINE' ? '/tabs/stock/tontine/returns' : '/tabs/stock/returns';
    this.router.navigate([base, stockReturn.id], { state: { operation: stockReturn } });
  }

  openCreateStandardRequestPage(): void {
    this.router.navigate(['/tabs/stock/requests/new']);
  }

  openCreateStandardReturnPage(): void {
    this.router.navigate(['/tabs/stock/returns/new']);
  }

  openCreateTontineRequestPage(): void {
    this.router.navigate(['/tabs/stock/tontine/requests/new']);
  }

  openCreateTontineReturnPage(): void {
    this.router.navigate(['/tabs/stock/tontine/returns/new']);
  }

  private refreshLists(): void {
    this.stockStateService.setContext(this.currentContext);
  }

  async openDetailModal(operation: StockRequest | StockReturn, type: 'request' | 'return'): Promise<void> {
    await this.presentStockModal(StockDetailModalComponent, { operation, type });
  }

  async openCreateTontineRequestForm(): Promise<void> {
    const modal = await this.presentStockModal(StockTontineRequestFormComponent, { isSubmitting: false });

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

  // ── Story 2.2: Créer une demande Standard ───────────────────────────────

  async openCreateRequestForm(): Promise<void> {
    const modal = await this.presentStockModal(StockRequestFormComponent, { isSubmitting: false });

    const { data, role } = await modal.onWillDismiss();

    if (role === 'submit' && data) {
      this.onCreateRequestSubmit(data);
    }
  }

  onCreateRequestSubmit(payload: CreateStockRequestPayload): void {
    this.stockApiService.createStandardRequest(payload).subscribe({
      next: async () => {
        await this.log.log('Standard stock request created successfully');
        console.log('[StockDashboard] Standard request created');
        this.stockStateService.setContext('STANDARD'); // Refresh list
      },
      error: async (err: Error) => {
        await this.log.error(`Create standard request failed: ${err?.message}`);
        console.log('[StockDashboard] Create standard request failed:', err?.message);

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

  // ── Story 2.3: Créer un retour Standard ─────────────────────────────────

  async openCreateReturnForm(): Promise<void> {
    const modal = await this.presentStockModal(StockReturnFormComponent, { isSubmitting: false });

    const { data, role } = await modal.onWillDismiss();

    if (role === 'submit' && data) {
      this.onCreateReturnSubmit(data);
    }
  }

  onCreateReturnSubmit(payload: CreateStockReturnPayload): void {
    this.stockApiService.createStandardReturn(payload).subscribe({
      next: async () => {
        await this.log.log('Standard stock return created successfully');
        console.log('[StockDashboard] Standard return created');
        this.stockStateService.setContext('STANDARD'); // Refresh list
      },
      error: async (err: Error) => {
        await this.log.error(`Create standard return failed: ${err?.message}`);
        console.log('[StockDashboard] Create standard return failed:', err?.message);

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
    const modal = await this.presentStockModal(StockTontineReturnFormComponent, { isSubmitting: false });

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
      header: 'Confirmer l\'annulation',
      message: 'Êtes-vous sûr de vouloir annuler cette opération ? Cette action est irréversible.',
      buttons: [
        { text: 'Garder', role: 'cancel' },
        {
          text: 'Annuler l\'opération',
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
      header: 'Confirmer l\'annulation',
      message: 'Êtes-vous sûr de vouloir annuler cette opération ? Cette action est irréversible.',
      buttons: [
        { text: 'Garder', role: 'cancel' },
        {
          text: 'Annuler l\'opération',
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

  /**
   * Presents stock modals (same pattern as distributions-list).
   * Avoid ion-footer inside modal components — it blocks pointer events on Ionic 8.
   */
  private async presentStockModal(
    component: Type<unknown>,
    componentProps?: Record<string, unknown>
  ): Promise<HTMLIonModalElement> {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const modal = await this.modalCtrl.create({
      component,
      componentProps,
      cssClass: 'stock-modal',
      backdropDismiss: true,
    });

    await modal.present();
    return modal;
  }
}

