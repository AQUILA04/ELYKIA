import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { OrderService } from '../../services/order.service';
import {
  Order,
  OrderKPI,
  OrderStatus,
  OrderState,
  KPICardConfig,
  StatusTabConfig,
  DEFAULT_STATUS_TABS,
  OrderAction
} from '../../types/order.types';
import { OrderTableAction, OrderSelectionChange } from '../../components/order-table/order-table.component';
import { BulkAction } from '../../components/order-action-bar/order-action-bar.component';
import { OrderDeleteModalComponent } from '../../components/modals/order-delete-modal/order-delete-modal.component';
// CORRECTION : Import manquant ajouté ici
import { OrderConfirmationModalComponent } from '../../components/modals/order-confirmation-modal/order-confirmation-modal.component';

@Component({
  selector: 'app-order-dashboard',
  templateUrl: './order-dashboard.component.html',
  styleUrls: ['./order-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables
  state$: Observable<OrderState>;
  kpiCards$!: Observable<KPICardConfig[]>;
  statusTabs$!: Observable<StatusTabConfig[]>;
  filteredOrders$!: Observable<Order[]>;

  // État local
  selectedOrders: Order[] = [];
  currentTab: OrderStatus | 'ALL' = OrderStatus.PENDING;
  statusTabs: StatusTabConfig[] = DEFAULT_STATUS_TABS;

  constructor(
    private orderService: OrderService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.state$ = this.orderService.state$;
    this.setupObservables();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupObservables(): void {
    this.kpiCards$ = this.state$.pipe(
      map(state => this.createKPICards(state.kpis)),
      startWith(this.createKPICards(null))
    );

    this.statusTabs$ = this.state$.pipe(
      map(state => {
        const tabs = this.createStatusTabs(state.orders);
        this.statusTabs = tabs;
        return tabs;
      }),
      startWith(DEFAULT_STATUS_TABS)
    );

    this.filteredOrders$ = this.state$.pipe(
      map(state => this.filterOrdersByTab(state.orders, this.currentTab))
    );
  }

  loadInitialData(): void {
    this.orderService.getKPIs().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      error: (error) => {
        console.error('Erreur lors du chargement des KPIs:', error);
      }
    });
    this.loadOrders();
  }

  private loadOrders(): void {
    const filters = this.currentTab !== 'ALL' ? { status: this.currentTab } : {};
    this.orderService.getOrders(0, 50, filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
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

  private createStatusTabs(orders: readonly Order[]): StatusTabConfig[] {
    const statusCounts = orders.reduce((counts, order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
      return counts;
    }, {} as Record<OrderStatus, number>);
    return DEFAULT_STATUS_TABS.map(tab => ({
      ...tab,
      count: tab.status === 'ALL'
        ? orders.filter(o => o.status === OrderStatus.DENIED || o.status === OrderStatus.CANCEL).length
        : statusCounts[tab.status] || 0
    }));
  }

  private filterOrdersByTab(orders: readonly Order[], tab: OrderStatus | 'ALL'): Order[] {
    if (tab === 'ALL') {
      return orders.filter(order => order.status === OrderStatus.DENIED || order.status === OrderStatus.CANCEL);
    }
    return orders.filter(order => order.status === tab);
  }

  onTabChange(tab: StatusTabConfig): void {
    this.currentTab = tab.status;
    this.orderService.setCurrentTab(tab.status);
    this.selectedOrders = [];
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
    this.router.navigate(['/orders/details', order.id]);
  }

  private editOrder(order: Order): void {
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
    this.updateOrderStatus([order.id], OrderStatus.ACCEPTED, 'acceptée');
  }

  private denyOrder(order: Order): void {
    this.updateOrderStatus([order.id], OrderStatus.DENIED, 'refusée');
  }

  private sellOrder(order: Order): void {
    const dialogRef = this.dialog.open(OrderConfirmationModalComponent, {
      width: '400px',
      data: { title: 'Transformer en vente', message: `Êtes-vous sûr de vouloir transformer la commande #${order.id} en vente ?` }
    });
    dialogRef.afterClosed().subscribe(result => {
        if(result) {
            this.orderService.sellOrder(order.id).pipe(takeUntil(this.destroy$)).subscribe({
                next: () => {
                    this.showSuccess('Commande transformée en vente avec succès');
                    this.loadOrders();
                },
                error: (error) => {
                    this.showError('Erreur lors de la transformation en vente');
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
    this.updateOrderStatus(orderIds, OrderStatus.ACCEPTED, 'acceptées');
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
      const dialogRef = this.dialog.open(OrderConfirmationModalComponent, {
          width: '400px',
          data: { title: 'Transformer en ventes', message: `Êtes-vous sûr de vouloir transformer ${orders.length} commande(s) en vente(s) ?` }
      });
      dialogRef.afterClosed().subscribe(result => {
          if(result) {
              const sellPromises = orders.map(order => this.orderService.sellOrder(order.id).toPromise());
              Promise.all(sellPromises).then(() => {
                  this.showSuccess(`${orders.length} commande(s) transformée(s) en vente avec succès`);
                  this.loadOrders();
                  this.onClearSelection();
              }).catch(() => {
                  this.showError('Erreur lors de la transformation en ventes');
              });
          }
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
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
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
    return tab.count !== undefined && tab.count > 0
      ? `${tab.label} (${tab.count})`
      : tab.label;
  }

  getTabColor(tab: StatusTabConfig): string {
    const colors = {
      'warning': '#f57c00',
      'primary': '#1976d2',
      'success': '#388e3c',
      'secondary': '#616161'
    };
    return colors[tab.color as keyof typeof colors] || '#616161';
  }

  get selectedOrderIds(): number[] {
    return [...(this.orderService.getCurrentState().selectedOrders || [])];
  }
}

