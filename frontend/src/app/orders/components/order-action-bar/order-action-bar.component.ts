import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnChanges, 
  SimpleChanges,
  ChangeDetectionStrategy 
} from '@angular/core';
import { Order, OrderAction, OrderStatus } from '../../types/order.types';

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

  @Output() bulkAction = new EventEmitter<BulkAction>();
  @Output() clearSelection = new EventEmitter<void>();

  availableActions: OrderAction[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedOrders']) {
      this.updateAvailableActions();
    }
  }

  /**
   * Met à jour les actions disponibles selon les commandes sélectionnées
   */
  private updateAvailableActions(): void {
    if (this.selectedOrders.length === 0) {
      this.availableActions = [];
      return;
    }

    // Déterminer les actions communes à toutes les commandes sélectionnées
    const allStatuses = this.selectedOrders.map(order => order.status);
    const uniqueStatuses = [...new Set(allStatuses)];

    // Actions possibles selon les statuts
    const possibleActions: OrderAction[] = [];

    // Si toutes les commandes sont PENDING
    if (uniqueStatuses.length === 1 && uniqueStatuses[0] === OrderStatus.PENDING) {
      possibleActions.push(OrderAction.ACCEPT, OrderAction.DENY, OrderAction.DELETE);
    }
    // Si toutes les commandes sont ACCEPTED
    else if (uniqueStatuses.length === 1 && uniqueStatuses[0] === OrderStatus.ACCEPTED) {
      possibleActions.push(OrderAction.SELL);
    }
    // Si toutes les commandes sont DENIED ou CANCEL
    else if (uniqueStatuses.every(status => status === OrderStatus.DENIED || status === OrderStatus.CANCEL)) {
      possibleActions.push(OrderAction.DELETE);
    }
    // Actions communes pour tous les statuts (sauf SOLD)
    if (!uniqueStatuses.includes(OrderStatus.SOLD)) {
      if (!possibleActions.includes(OrderAction.DELETE)) {
        // Vérifier si toutes les commandes peuvent être supprimées
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

    this.availableActions = possibleActions;
  }

  /**
   * Exécute une action groupée
   */
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

  /**
   * Efface la sélection
   */
  onClearSelection(): void {
    this.clearSelection.emit();
  }

  /**
   * Retourne le label d'une action
   */
  getActionLabel(action: OrderAction): string {
    const labels = {
      [OrderAction.VIEW]: 'Voir la sélection',
      [OrderAction.EDIT]: 'Modifier la sélection',
      [OrderAction.ACCEPT]: 'Accepter la sélection',
      [OrderAction.DENY]: 'Refuser la sélection',
      [OrderAction.DELETE]: 'Supprimer la sélection',
      [OrderAction.SELL]: 'Vendre la sélection',
      [OrderAction.CANCEL]: 'Annuler la sélection'
    };
    return labels[action] || action;
  }

  /**
   * Retourne l'icône d'une action
   */
  getActionIcon(action: OrderAction): string {
    const icons = {
      [OrderAction.VIEW]: 'visibility',
      [OrderAction.EDIT]: 'edit',
      [OrderAction.ACCEPT]: 'check',
      [OrderAction.DENY]: 'close',
      [OrderAction.DELETE]: 'delete',
      [OrderAction.SELL]: 'monetization_on',
      [OrderAction.CANCEL]: 'cancel'
    };
    return icons[action] || 'more_vert';
  }

  /**
   * Retourne la couleur d'une action
   */
  getActionColor(action: OrderAction): string {
    const colors = {
      [OrderAction.VIEW]: 'primary',
      [OrderAction.EDIT]: 'primary',
      [OrderAction.ACCEPT]: 'primary',
      [OrderAction.DENY]: 'warn',
      [OrderAction.DELETE]: 'warn',
      [OrderAction.SELL]: 'primary',
      [OrderAction.CANCEL]: 'warn'
    };
    return colors[action] || 'primary';
  }

  /**
   * Vérifie si une action nécessite une confirmation
   */
  requiresConfirmation(action: OrderAction): boolean {
    return [
      OrderAction.DELETE,
      OrderAction.DENY,
      OrderAction.CANCEL,
      OrderAction.SELL
    ].includes(action);
  }

  /**
   * Retourne le nombre de commandes sélectionnées
   */
  get selectionCount(): number {
    return this.selectedOrders.length;
  }

  /**
   * Retourne le texte de sélection
   */
  get selectionText(): string {
    const count = this.selectionCount;
    if (count === 0) return '';
    if (count === 1) return '1 commande sélectionnée';
    return `${count} commandes sélectionnées`;
  }

  /**
   * Vérifie si la barre d'actions doit être visible
   */
  get shouldShow(): boolean {
    return this.visible && this.selectedOrders.length > 0;
  }
}