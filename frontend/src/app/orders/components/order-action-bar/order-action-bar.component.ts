import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnChanges, 
  SimpleChanges,
  ChangeDetectionStrategy 
} from '@angular/core';
import { Order, OrderAction, getAvailableActions, OrderActionContext } from '../../types/order.types';

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
  @Input() currentUsername: string | null = null;
  @Input() canDelete = false;
  @Input() canDeny = false;
  @Input() canRequestStock = false;

  @Output() bulkAction = new EventEmitter<BulkAction>();
  @Output() clearSelection = new EventEmitter<void>();

  availableActions: OrderAction[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedOrders'] || changes['onlineMode'] || changes['currentUsername']
        || changes['canDelete'] || changes['canDeny'] || changes['canRequestStock']) {
      this.updateAvailableActions();
    }
  }

  private updateAvailableActions(): void {
    if (this.selectedOrders.length === 0) {
      this.availableActions = [];
      return;
    }

    const context = this.actionContext();
    const perOrder = this.selectedOrders.map(order => getAvailableActions(order, context));
    const shared = perOrder[0].filter(action =>
      action !== OrderAction.VIEW
      && action !== OrderAction.EDIT
      && perOrder.every(actions => actions.includes(action))
    );
    this.availableActions = shared;
  }

  private actionContext(): OrderActionContext {
    return {
      onlineMode: this.onlineMode,
      username: this.currentUsername,
      canDelete: this.canDelete,
      canDeny: this.canDeny,
      canRequestStock: this.canRequestStock
    };
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
