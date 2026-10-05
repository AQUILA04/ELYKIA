import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnChanges, 
  SimpleChanges,
  ChangeDetectionStrategy 
} from '@angular/core';
import { Order, OrderAction, OrderStatus, canCreateStockRequest } from '../../types/order.types';

export interface BulkAction {
  action: OrderAction;
  orderIds: number[];
  orders: Order[];
}

@Component({
  selector: 'app-order-action-bar',
  templateUrl: './order-action-bar.component.html',
  styleUrls: ['./order-action-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderActionBarComponent implements OnChanges {
  @Input() selectedOrders: Order[] = [];
  @Input() visible: boolean = false;
  @Input() loading: boolean = false;
  @Input() onlineMode: boolean = false;

  @Output() bulkAction = new EventEmitter<BulkAction>();
  @Output() clearSelection = new EventEmitter<void>();

  availableActions: OrderAction[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedOrders'] || changes['onlineMode']) {
      this.updateAvailableActions();
    }
  }

  private updateAvailableActions(): void {
    if (this.selectedOrders.length === 0) {
      this.availableActions = [];
      return;
    }

    const allStatuses = this.selectedOrders.map(order => order.status);
    const uniqueStatuses = [...new Set(allStatuses)];
    const possibleActions: OrderAction[] = [];

    if (uniqueStatuses.length === 1 && uniqueStatuses[0] === OrderStatus.PENDING) {
      possibleActions.push(OrderAction.ACCEPT, OrderAction.DENY, OrderAction.DELETE);
    } else if (uniqueStatuses.length === 1 && uniqueStatuses[0] === OrderStatus.ACCEPTED) {
      possibleActions.push(OrderAction.SELL);
    } else if (uniqueStatuses.every(status => status === OrderStatus.DENIED || status === OrderStatus.CANCEL)) {
      possibleActions.push(OrderAction.DELETE);
    }

    if (!uniqueStatuses.includes(OrderStatus.SOLD)) {
      if (!possibleActions.includes(OrderAction.DELETE)) {
        const canDeleteAll = this.selectedOrders.every(order =>
          order.status === OrderStatus.PENDING ||
          order.status === OrderStatus.DENIED ||
          order.status === OrderStatus.CANCEL
        );
        if (canDeleteAll) {
          possibleActions.push(OrderAction.DELETE);
        }
      }
    }

    const canStockRequestAll = this.selectedOrders.every(order => canCreateStockRequest(order));
    if (canStockRequestAll) {
      possibleActions.push(OrderAction.STOCK_REQUEST);
    }

    this.availableActions = possibleActions;
  }

  onBulkAction(action: OrderAction): void {
    if (this.selectedOrders.length === 0 || this.loading) {
      return;
    }

    const orderIds = this.selectedOrders.map(order => order.id);
    
    this.bulkAction.emit({
      action,
      orderIds,
      orders: [...this.selectedOrders]
    });
  }

  onClearSelection(): void {
    this.clearSelection.emit();
  }

  getActionLabel(action: OrderAction): string {
    const labels = {
      [OrderAction.VIEW]: 'Voir la sélection',
      [OrderAction.EDIT]: 'Modifier la sélection',
      [OrderAction.ACCEPT]: this.onlineMode ? 'Valider la sélection' : 'Accepter la sélection',
      [OrderAction.DENY]: 'Refuser la sélection',
      [OrderAction.DELETE]: 'Supprimer la sélection',
      [OrderAction.SELL]: this.onlineMode ? 'Marquer comme livrée' : 'Vendre la sélection',
      [OrderAction.CANCEL]: 'Annuler la sélection',
      [OrderAction.STOCK_REQUEST]: 'Faire une demande de stock'
    };
    return labels[action] || action;
  }

  getActionIcon(action: OrderAction): string {
    const icons = {
      [OrderAction.VIEW]: 'visibility',
      [OrderAction.EDIT]: 'edit',
      [OrderAction.ACCEPT]: 'check',
      [OrderAction.DENY]: 'close',
      [OrderAction.DELETE]: 'delete',
      [OrderAction.SELL]: this.onlineMode ? 'local_shipping' : 'monetization_on',
      [OrderAction.CANCEL]: 'cancel',
      [OrderAction.STOCK_REQUEST]: 'inventory_2'
    };
    return icons[action] || 'more_vert';
  }

  getActionColor(action: OrderAction): string {
    const colors = {
      [OrderAction.VIEW]: 'primary',
      [OrderAction.EDIT]: 'primary',
      [OrderAction.ACCEPT]: 'primary',
      [OrderAction.DENY]: 'warn',
      [OrderAction.DELETE]: 'warn',
      [OrderAction.SELL]: 'primary',
      [OrderAction.CANCEL]: 'warn',
      [OrderAction.STOCK_REQUEST]: 'accent'
    };
    return colors[action] || 'primary';
  }

  requiresConfirmation(action: OrderAction): boolean {
    return [
      OrderAction.DELETE,
      OrderAction.DENY,
      OrderAction.CANCEL,
      OrderAction.SELL,
      OrderAction.STOCK_REQUEST
    ].includes(action);
  }

  get selectionCount(): number {
    return this.selectedOrders.length;
  }

  get selectionText(): string {
    const count = this.selectionCount;
    if (count === 0) return '';
    if (count === 1) return '1 commande sélectionnée';
    return `${count} commandes sélectionnées`;
  }

  get shouldShow(): boolean {
    return this.visible && this.selectedOrders.length > 0;
  }
}
