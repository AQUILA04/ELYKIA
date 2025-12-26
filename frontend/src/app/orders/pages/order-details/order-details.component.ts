import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef, // CORRECTION : Import du ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators'; // CORRECTION : Ajout de 'finalize'
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { OrderService } from '../../services/order.service';
import {
  Order,
  OrderAction,
  OrderStatus,
  getAvailableActions,
  getOrderStatusLabel,
  getOrderStatusColor,
  formatCurrency,
  formatDateTime,
  canModifyOrder,
  canDeleteOrder,
  canSellOrder,
  OrderItem,
} from '../../types/order.types';
import { OrderConfirmationModalComponent } from '../../components/modals/order-confirmation-modal/order-confirmation-modal.component';

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  order: Order | null = null;
  isLoading = true; // Initialiser à true
  isProcessing = false;
  orderId: number | null = null;

  OrderStatus = OrderStatus;
  OrderAction = OrderAction;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef // CORRECTION : Injection du ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['id']) {
        this.orderId = +params['id'];
        this.loadOrder();
      } else {
        this.isLoading = false; // Pas d'ID, on arrête de charger
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrder(): void {
    if (!this.orderId) return;

    this.isLoading = true;
    this.orderService.getOrderById(this.orderId).pipe(
      takeUntil(this.destroy$),
      // L'opérateur finalize s'assure que isLoading passe à false même en cas d'erreur
      finalize(() => {
        this.isLoading = false;
        // CORRECTION : On notifie Angular que l'état a changé
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        this.order = response.data ?? null;
        if (!this.order) {
          this.showError('Commande non trouvée');
          this.router.navigate(['/orders']);
        }
      },
      error: () => {
        this.showError('Erreur lors du chargement de la commande');
        this.router.navigate(['/orders']);
      }
    });
  }

  // === GETTERS POUR LE TEMPLATE ===
  get availableActions(): OrderAction[] { return this.order ? getAvailableActions(this.order.status) : []; }
  get canEdit(): boolean { return this.order ? canModifyOrder(this.order.status) : false; }
  get canDelete(): boolean { return this.order ? canDeleteOrder(this.order.status) : false; }
  get canSell(): boolean { return this.order ? canSellOrder(this.order.status) : false; }
  get statusLabel(): string { return this.order ? getOrderStatusLabel(this.order.status) : ''; }
  get statusColor(): string { return this.order ? getOrderStatusColor(this.order.status) : 'secondary'; }
  get totalItems(): number { return this.order ? (this.order.items || []).reduce((total, item) => total + item.quantity, 0) : 0; }
  get uniqueItemsCount(): number { return this.order ? (this.order.items || []).length : 0; }
  getClientName(order: Order): string { return `${order.client?.firstname || ''} ${order.client?.lastname || ''}`.trim() || 'Client inconnu'; }

  // === ACTIONS ===
  goBack(): void { this.router.navigate(['/orders']); }
  editOrder(): void { if (this.order && this.canEdit) this.router.navigate(['/orders/edit', this.order.id]); }

  deleteOrder(): void {
    if (!this.order || !this.canDelete) return;
    this.confirmAction(
      'Supprimer la commande',
      `Êtes-vous sûr de vouloir supprimer la commande #${this.order.id} ? Cette action est irréversible.`,
      () => this.performDelete()
    );
  }

  acceptOrder(): void { if (this.order) this.updateOrderStatus(OrderStatus.ACCEPTED, 'acceptée'); }
  denyOrder(): void { if (this.order) this.updateOrderStatus(OrderStatus.DENIED, 'refusée'); }
  cancelOrder(): void { if (this.order) this.updateOrderStatus(OrderStatus.CANCEL, 'annulée'); }

  sellOrder(): void {
    if (!this.order || !this.canSell) return;
    this.confirmAction(
      'Transformer en vente',
      `Êtes-vous sûr de vouloir transformer la commande #${this.order.id} en vente ?`,
      () => this.performSell()
    );
  }

  // === MÉTHODES PRIVÉES ===
  private updateOrderStatus(newStatus: OrderStatus, actionLabel: string): void {
    if (!this.order) return;
    this.isProcessing = true;
    this.orderService.updateOrdersStatus({ orderIds: [this.order.id], newStatus }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isProcessing = false;
        this.cdr.markForCheck(); // Notifier Angular après l'action
      })
    ).subscribe({
      next: (response) => {
        this.order = response.data?.[0] || this.order;
        this.showSuccess(`Commande ${actionLabel} avec succès`);
      },
      error: () => {
        this.showError(`Erreur lors de la mise à jour du statut`);
      }
    });
  }

  private performDelete(): void {
    if (!this.order) return;
    this.isProcessing = true;
    this.cdr.markForCheck();
    this.orderService.deleteOrder(this.order.id).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isProcessing = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.showSuccess('Commande supprimée avec succès');
        this.router.navigate(['/orders']);
      },
      error: () => {
        this.showError('Erreur lors de la suppression de la commande');
      }
    });
  }

  private performSell(): void {
    if (!this.order) return;
    this.isProcessing = true;
    this.cdr.markForCheck();
    this.orderService.sellOrder(this.order.id).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isProcessing = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.showSuccess('Commande transformée en vente avec succès');
        this.loadOrder();
      },
      error: () => {
        this.showError('Erreur lors de la transformation en vente');
      }
    });
  }

  private confirmAction(title: string, message: string, callback: () => void): void {
    const dialogRef = this.dialog.open(OrderConfirmationModalComponent, { width: '400px', data: { title, message } });
    dialogRef.afterClosed().subscribe(result => { if (result) callback(); });
  }

  private showSuccess(message: string): void { this.snackBar.open(message, 'Fermer', { duration: 3000, panelClass: ['success-snackbar'] }); }
  private showError(message: string): void { this.snackBar.open(message, 'Fermer', { duration: 5000, panelClass: ['error-snackbar'] }); }

  // === MÉTHODES UTILITAIRES POUR LE TEMPLATE ===
  formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) {
      return '...';
    }
    return formatCurrency(amount);
  };

  formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) {
      return '--';
    }
    return formatDateTime(dateString);
  };

  getActionIcon(action: OrderAction): string {
    const icons: Record<OrderAction, string> = {
      [OrderAction.VIEW]: 'visibility', [OrderAction.EDIT]: 'edit', [OrderAction.DELETE]: 'delete',
      [OrderAction.ACCEPT]: 'check', [OrderAction.DENY]: 'close', [OrderAction.SELL]: 'monetization_on',
      [OrderAction.CANCEL]: 'cancel'
    };
    return icons[action] || 'more_vert';
  }

  getActionLabel(action: OrderAction): string {
    const labels: Record<OrderAction, string> = {
      [OrderAction.VIEW]: 'Voir', [OrderAction.EDIT]: 'Modifier', [OrderAction.DELETE]: 'Supprimer',
      [OrderAction.ACCEPT]: 'Accepter', [OrderAction.DENY]: 'Refuser', [OrderAction.SELL]: 'Transformer en vente',
      [OrderAction.CANCEL]: 'Annuler'
    };
    return labels[action] || action;
  }

  executeAction(action: OrderAction): void {
    switch (action) {
      case OrderAction.EDIT: this.editOrder(); break;
      case OrderAction.DELETE: this.deleteOrder(); break;
      case OrderAction.ACCEPT: this.acceptOrder(); break;
      case OrderAction.DENY: this.denyOrder(); break;
      case OrderAction.SELL: this.sellOrder(); break;
      case OrderAction.CANCEL: this.cancelOrder(); break;
    }
  }

  trackByItemId = (index: number, item: OrderItem): number => item.id;
}
