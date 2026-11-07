import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, startWith, finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { OrderService } from '../../services/order.service';
import {
  Order,
  OrderKPI,
  OrderStatus,
  OrderSource,
  OrderState,
  KPICardConfig,
  StatusTabConfig,
  DEFAULT_STATUS_TABS,
  OrderAction,
  OrderFilters,
  PendingStockRequestPreview
} from '../../types/order.types';
import { AuthService } from 'src/app/auth/service/auth.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { OrderTableAction, OrderSelectionChange } from '../../components/order-table/order-table.component';
import { BulkAction } from '../../components/order-action-bar/order-action-bar.component';
import { OrderDeleteModalComponent } from '../../components/modals/order-delete-modal/order-delete-modal.component';
import { OrderConfirmationModalComponent } from '../../components/modals/order-confirmation-modal/order-confirmation-modal.component';
import {
  OrderStockRequestModalComponent,
  OrderStockRequestModalResult
} from '../../components/modals/order-stock-request-modal/order-stock-request-modal.component';
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-order-dashboard',
  templateUrl: './order-dashboard.component.html',
  styleUrls: ['./order-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class OrderDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  currentDate = new Date();
  lastUpdate = new Date();
  onlineMode = false;
  pageTitle = 'Commandes';
  pageSurtitle = 'GESTION DES COMMANDES';

  // Observables
  state$: Observable<OrderState>;
  kpiCards$!: Observable<KPICardConfig[]>;
  filteredOrders$!: Observable<Order[]>;

  // État local
  selectedOrders: Order[] = [];
  currentTab: OrderStatus | 'ALL' = OrderStatus.PENDING;
  statusTabs: StatusTabConfig[] = DEFAULT_STATUS_TABS;
  searchTerm = '';
  selectedCommercial: string | null = null;
  canSelectCommercial = false;
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;
  currentUsername: string | null = null;
  canDelete = false;
  canDeny = false;
  canRequestStock = false;
  pendingStockBusy = false;
  private tabCounts: Partial<Record<OrderStatus | 'ALL', number>> = {};
  private suppressTabChange = true;

  constructor(
    private orderService: OrderService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private toastr: ToastrService,
    private authService: AuthService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {
    this.state$ = this.orderService.state$;
    this.setupObservables();
  }

  ngOnInit(): void {
    this.onlineMode = this.route.snapshot.data['source'] === OrderSource.CUSTOMER_SPACE;
    if (this.onlineMode) {
      this.pageTitle = 'Commandes en ligne';
      this.pageSurtitle = 'SERVICES EN LIGNE';
    }
    this.applyActionRights();
    this.restoreState();
    this.loadInitialData();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.suppressTabChange = false;
    });
  }

  ngOnDestroy(): void {
    this.saveState();
    this.destroy$.next();
    this.destroy$.complete();
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  refresh(): void {
    this.loadInitialData();
  }

  get selectedTabIndex(): number {
    const index = this.statusTabs.findIndex(tab => tab.status === this.currentTab);
    return index >= 0 ? index : 0;
  }

  private setupObservables(): void {
    this.kpiCards$ = this.state$.pipe(
      map(state => this.createKPICards(state.kpis)),
      startWith(this.createKPICards(null))
    );

    this.filteredOrders$ = this.state$.pipe(
      map(state => [...state.orders])
    );
  }

  loadInitialData(): void {
    this.orderService.getKPIs(this.onlineMode ? OrderSource.CUSTOMER_SPACE : undefined).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.lastUpdate = new Date();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des KPIs:', error);
      }
    });
    this.loadOrders();
  }

  private loadOrders(): void {
    const filters: OrderFilters = {};
    if (this.currentTab === 'ALL') {
      filters.statuses = [OrderStatus.DENIED, OrderStatus.CANCEL];
    } else {
      filters.status = this.currentTab;
    }
    if (this.onlineMode) {
      filters.source = OrderSource.CUSTOMER_SPACE;
    }
    const search = this.searchTerm.trim();
    if (search) {
      filters.searchTerm = search;
    }
    if (this.canSelectCommercial && this.selectedCommercial) {
      filters.commercial = this.selectedCommercial;
    }
    this.orderService.getOrders(this.pageIndex, this.pageSize, filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.lastUpdate = new Date();
        this.totalElements = this.orderService.getCurrentState().pagination.totalElements ?? 0;
        this.tabCounts = { ...this.tabCounts, [this.currentTab]: this.totalElements };
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commandes:', error);
        this.showError('Erreur lors du chargement des commandes');
      }
    });
  }

  private createKPICards(kpis: OrderKPI | null): KPICardConfig[] {
    if (!kpis) {
      return [
        { title: 'Commandes en Attente', value: 0, icon: 'schedule', color: 'warning' },
        { title: 'Valeur Potentielle', value: '0 XOF', icon: 'trending_up', color: 'info' },
        { title: 'Taux d\'Acceptation', value: '0%', icon: 'check_circle', color: 'success' },
        { title: 'Bénéfice Potentiel', value: '0 XOF', icon: 'account_balance_wallet', color: 'success' },
        { title: 'Pipeline Accepté', value: '0 XOF', icon: 'monetization_on', color: 'primary' }
      ];
    }
    return [
      { title: 'Commandes en Attente', value: kpis.pendingOrders ?? 0, icon: 'schedule', color: 'warning', subtitle: 'À traiter' },
      { title: 'Valeur Potentielle', value: kpis.potentialValue ?? '0 XOF', icon: 'trending_up', color: 'info', subtitle: 'Montant total en attente' },
      { title: 'Taux d\'Acceptation', value: `${kpis.acceptanceRate ?? 0}%`, icon: 'check_circle', color: 'success', subtitle: 'Performance globale' },
      { title: 'Bénéfice Potentiel', value: kpis.potentialProfit ?? '0 XOF', icon: 'account_balance_wallet', color: 'success', subtitle: 'Marge estimée' },
      { title: 'Pipeline Accepté', value: kpis.acceptedPipelineValue ?? '0 XOF', icon: 'monetization_on', color: 'primary', subtitle: 'Prêt à vendre' }
    ];
  }

  countFor(tab: StatusTabConfig): number | undefined {
    return this.tabCounts[tab.status];
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.onClearSelection();
    this.saveState();
    this.loadOrders();
  }

  onCommercialSelected(username: string | null): void {
    if (username === this.selectedCommercial) {
      return;
    }
    this.selectedCommercial = username;
    this.pageIndex = 0;
    this.onClearSelection();
    this.saveState();
    this.loadOrders();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCommercial = null;
    this.pageIndex = 0;
    this.onClearSelection();
    this.saveState();
    this.loadOrders();
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.onClearSelection();
    this.saveState();
    this.loadOrders();
  }

  onTabChange(tab: StatusTabConfig): void {
    if (this.suppressTabChange || !tab || tab.status === this.currentTab) {
      return;
    }
    this.currentTab = tab.status;
    this.pageIndex = 0;
    this.orderService.setCurrentTab(tab.status);
    this.onClearSelection();
    this.saveState();
    this.loadOrders();
  }

  onSelectionChange(event: OrderSelectionChange): void {
    this.selectedOrders = event.selectedOrders;
    this.orderService.updateSelection(event.selectedIds);
  }

  onOrderAction(event: OrderTableAction): void {
    const { order, action } = event;
    switch (action) {
      case OrderAction.VIEW: this.viewOrder(order); break;
      case OrderAction.EDIT: this.editOrder(order); break;
      case OrderAction.DELETE: this.deleteOrder(order); break;
      case OrderAction.ACCEPT: this.acceptOrder(order); break;
      case OrderAction.DENY: this.denyOrder(order); break;
      case OrderAction.SELL: this.sellOrder(order); break;
      case OrderAction.CANCEL: this.cancelOrder(order); break;
      case OrderAction.STOCK_REQUEST: this.createStockRequest([order]); break;
    }
  }

  onBulkAction(event: BulkAction): void {
    const { action, orders } = event;
    switch (action) {
      case OrderAction.ACCEPT: this.acceptOrders(orders); break;
      case OrderAction.DENY: this.denyOrders(orders); break;
      case OrderAction.DELETE: this.deleteOrders(orders); break;
      case OrderAction.SELL: this.sellOrders(orders); break;
      case OrderAction.CANCEL: this.cancelOrders(orders); break;
      case OrderAction.STOCK_REQUEST: this.createStockRequest(orders); break;
    }
  }

  onClearSelection(): void {
    this.selectedOrders = [];
    this.orderService.clearSelection();
  }

  onRowClick(order: Order): void {
    this.viewOrder(order);
  }

  private viewOrder(order: Order): void {
    const base = this.onlineMode ? '/orders/online/details' : '/orders/details';
    this.router.navigate([base, order.id]);
  }

  private editOrder(order: Order): void {
    if (this.onlineMode) {
      return;
    }
    this.router.navigate(['/orders/edit', order.id]);
  }

  private deleteOrder(order: Order): void {
    const dialogRef = this.dialog.open(OrderDeleteModalComponent, {
      width: '500px',
      data: { order: order }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.orderService.deleteOrder(order.id).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            this.showSuccess('Commande supprimée avec succès');
            this.loadOrders();
          },
          error: (error) => {
            this.showError('Erreur lors de la suppression de la commande');
          }
        });
      }
    });
  }

  private acceptOrder(order: Order): void {
    this.updateOrderStatus([order.id], OrderStatus.ACCEPTED, this.onlineMode ? 'validée' : 'acceptée');
  }

  private denyOrder(order: Order): void {
    this.updateOrderStatus([order.id], OrderStatus.DENIED, 'refusée');
  }

  private sellOrder(order: Order): void {
    const title = this.onlineMode ? 'Marquer comme livrée' : 'Transformer en vente';
    const message = this.onlineMode
      ? `Marquer la commande #${order.id} comme livrée et créer la vente ?`
      : `Êtes-vous sûr de vouloir transformer la commande #${order.id} en vente ?`;
    const dialogRef = this.dialog.open(OrderConfirmationModalComponent, {
      width: '400px',
      data: { title, message }
    });
    dialogRef.afterClosed().subscribe(result => {
        if(result) {
            this.orderService.sellOrder(order.id).pipe(takeUntil(this.destroy$)).subscribe({
                next: () => {
                    this.showSuccess(this.onlineMode
                      ? 'Commande marquée comme livrée'
                      : 'Commande transformée en vente avec succès');
                    this.loadOrders();
                },
                error: (error) => {
                    this.showError(error?.error?.message || 'Erreur lors de la transformation en vente');
                }
            });
        }
    });
  }

  private cancelOrder(order: Order): void {
    this.updateOrderStatus([order.id], OrderStatus.CANCEL, 'annulée');
  }

  private acceptOrders(orders: Order[]): void {
    const orderIds = orders.map(o => o.id);
    this.updateOrderStatus(orderIds, OrderStatus.ACCEPTED, this.onlineMode ? 'validées' : 'acceptées');
  }

  private denyOrders(orders: Order[]): void {
    const orderIds = orders.map(o => o.id);
    this.updateOrderStatus(orderIds, OrderStatus.DENIED, 'refusées');
  }

  private deleteOrders(orders: Order[]): void {
      const dialogRef = this.dialog.open(OrderConfirmationModalComponent, {
          width: '400px',
          data: { title: 'Supprimer les commandes', message: `Êtes-vous sûr de vouloir supprimer ${orders.length} commande(s) ?` }
      });
      dialogRef.afterClosed().subscribe(result => {
          if(result) {
              const deletePromises = orders.map(order => this.orderService.deleteOrder(order.id).toPromise());
              Promise.all(deletePromises).then(() => {
                  this.showSuccess(`${orders.length} commande(s) supprimée(s) avec succès`);
                  this.loadOrders();
                  this.onClearSelection();
              }).catch(() => {
                  this.showError('Erreur lors de la suppression des commandes');
              });
          }
      });
  }

  private sellOrders(orders: Order[]): void {
      const title = this.onlineMode ? 'Marquer comme livrées' : 'Transformer en ventes';
      const message = this.onlineMode
        ? `Marquer ${orders.length} commande(s) comme livrée(s) et créer les ventes ?`
        : `Êtes-vous sûr de vouloir transformer ${orders.length} commande(s) en vente(s) ?`;
      const dialogRef = this.dialog.open(OrderConfirmationModalComponent, {
          width: '400px',
          data: { title, message }
      });
      dialogRef.afterClosed().subscribe(result => {
          if(result) {
              const sellPromises = orders.map(order => this.orderService.sellOrder(order.id).toPromise());
              Promise.all(sellPromises).then(() => {
                  this.showSuccess(this.onlineMode
                    ? `${orders.length} commande(s) marquée(s) comme livrée(s)`
                    : `${orders.length} commande(s) transformée(s) en vente avec succès`);
                  this.loadOrders();
                  this.onClearSelection();
              }).catch((err: any) => {
                  this.showError(err.error?.message ?? err.message ?? 'Erreur lors de la transformation en ventes');
              });
          }
      });
  }

  downloadOrderSheet(order: Order): void {
    this.orderService.downloadOrderSheet(order.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => this.savePdf(data, `fiche-commande-${order.id}.pdf`),
      error: (err) => this.showError(err?.error?.message || 'Erreur lors du téléchargement de la fiche')
    });
  }

  requestStockForAllPending(): void {
    if (!this.canRequestStock || this.pendingStockBusy) {
      return;
    }
    const source = this.onlineMode ? OrderSource.CUSTOMER_SPACE : undefined;
    this.pendingStockBusy = true;
    this.cdr.markForCheck();
    this.orderService.previewPendingStockRequests(source).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.pendingStockBusy = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (preview: PendingStockRequestPreview) => this.openPendingStockDialog(preview, source),
      error: (err) => this.showError(err?.error?.message || err?.message || 'Erreur lors de la préparation de la demande de stock')
    });
  }

  private openPendingStockDialog(preview: PendingStockRequestPreview, source?: OrderSource): void {
    if (!preview?.groups?.length) {
      this.showError('Aucune commande en attente éligible pour une demande de stock.');
      return;
    }
    const dialogRef = this.dialog.open(OrderStockRequestModalComponent, {
      width: '560px',
      data: {
        orderCount: preview.orderCount,
        groups: preview.groups.map(group => ({
          collector: group.collector,
          orderIds: [...group.orderIds],
          articles: group.articles.map(article => ({ name: article.name, quantity: article.quantity }))
        }))
      }
    });
    dialogRef.afterClosed().subscribe((result: OrderStockRequestModalResult | undefined) => {
      if (!result?.confirmed) {
        return;
      }
      this.pendingStockBusy = true;
      this.cdr.markForCheck();
      this.orderService.createStockRequestsFromPending(result.forNextMonth, source).pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.pendingStockBusy = false;
          this.cdr.markForCheck();
        })
      ).subscribe({
        next: (created) => {
          const count = Array.isArray(created) ? created.length : 1;
          this.showSuccess(
            count > 1
              ? `${count} demandes de stock créées`
              : 'Demande de stock créée avec succès'
          );
          this.loadOrders();
          this.onClearSelection();
        },
        error: (err) => this.showError(err?.error?.message || err?.message || 'Erreur lors de la création de la demande de stock')
      });
    });
  }

  private savePdf(data: Blob, filename: string): void {
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
    this.showSuccess('Fiche de commande téléchargée');
  }

  private createStockRequest(orders: Order[]): void {
    if (!orders.length) {
      return;
    }
    const dialogRef = this.dialog.open(OrderStockRequestModalComponent, {
      width: '560px',
      data: { orders }
    });
    dialogRef.afterClosed().subscribe((result: OrderStockRequestModalResult | undefined) => {
      if (!result?.confirmed) {
        return;
      }
      const orderIds = orders.map(o => o.id);
      this.orderService.createStockRequestFromOrders(orderIds, result.forNextMonth).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (created) => {
          const count = Array.isArray(created) ? created.length : 1;
          this.showSuccess(
            count > 1
              ? `${count} demandes de stock créées`
              : 'Demande de stock créée avec succès'
          );
          this.loadOrders();
          this.onClearSelection();
        },
        error: (err) => {
          this.showError(err?.error?.message || err?.message || 'Erreur lors de la création de la demande de stock');
        }
      });
    });
  }

  private cancelOrders(orders: Order[]): void {
    const orderIds = orders.map(o => o.id);
    this.updateOrderStatus(orderIds, OrderStatus.CANCEL, 'annulées');
  }

  private updateOrderStatus(orderIds: number[], status: OrderStatus, actionLabel: string): void {
    this.orderService.updateOrdersStatus({ orderIds, newStatus: status }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        const count = orderIds.length;
        const message = count === 1
          ? `Commande ${actionLabel} avec succès`
          : `${count} commandes ${actionLabel} avec succès`;
        this.showSuccess(message);
        this.loadOrders();
        this.onClearSelection();
      },
      error: (error) => {
        this.showError(`Erreur lors de la mise à jour du statut`);
      }
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.toastr.error(message, 'Erreur');
  }

  createOrder(): void {
    this.router.navigate(['/orders/create']);
  }

  viewReports(): void {
    this.showSuccess('Fonctionnalité des rapports à venir');
  }

  trackByTabStatus(index: number, tab: StatusTabConfig): string {
    return tab.status;
  }

  trackByKpiTitle(index: number, kpi: KPICardConfig): string {
    return kpi.title;
  }

  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }

  getTabLabel(tab: StatusTabConfig): string {
    const count = this.countFor(tab);
    return count !== undefined && count > 0
      ? `${tab.label} (${count})`
      : tab.label;
  }

  getTabColor(tab: StatusTabConfig): string {
    const colors = {
      'warning': '#c75000',
      'primary': '#003366',
      'success': '#1d8a3c',
      'secondary': '#6b7a99'
    };
    return colors[tab.color as keyof typeof colors] || '#6b7a99';
  }

  getKpiCardClass(color?: string): string {
    switch (color) {
      case 'warning': return 'kpi-delai';
      case 'info': return 'kpi-amount';
      case 'success': return 'kpi-green';
      case 'primary': return 'kpi-total';
      default: return 'kpi-muted';
    }
  }

  get selectedOrderIds(): number[] {
    return [...(this.orderService.getCurrentState().selectedOrders || [])];
  }

  private get listStateKey(): string {
    return this.onlineMode ? 'orderOnlineListState' : 'orderListState';
  }

  private applyActionRights(): void {
    const user = this.authService.getCurrentUser();
    this.currentUsername = user?.username ?? null;
    this.canDelete = this.authService.hasRole('ROLE_DEL_ORDER');
    this.canDeny = this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.canRequestStock = this.authService.hasRole('ROLE_ORDER_STOCK_REQUEST');
    this.canSelectCommercial = !this.userService.hasProfile(UserProfile.PROMOTER) && (
      this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN)
      || this.userService.hasProfile(UserProfile.SECRETARY)
      || this.userService.hasProfile(UserProfile.STOREKEEPER)
    );
  }

  private saveState(): void {
    const state = {
      searchTerm: this.searchTerm,
      selectedCommercial: this.canSelectCommercial ? this.selectedCommercial : null,
      currentTab: this.currentTab,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize
    };
    sessionStorage.setItem(this.listStateKey, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.listStateKey);
    if (!saved) {
      return;
    }
    try {
      const state = JSON.parse(saved) as {
        searchTerm?: string;
        selectedCommercial?: string | null;
        currentTab?: OrderStatus | 'ALL';
        pageIndex?: number;
        pageSize?: number;
      };
      this.searchTerm = state.searchTerm ?? '';
      this.selectedCommercial = this.canSelectCommercial ? (state.selectedCommercial ?? null) : null;
      const knownTab = DEFAULT_STATUS_TABS.some(tab => tab.status === state.currentTab);
      this.currentTab = knownTab && state.currentTab ? state.currentTab : OrderStatus.PENDING;
      this.pageIndex = state.pageIndex ?? 0;
      this.pageSize = state.pageSize ?? 10;
      this.orderService.setCurrentTab(this.currentTab);
    } catch (error) {
      console.error('Erreur restauration état liste commandes', error);
    }
  }
}


