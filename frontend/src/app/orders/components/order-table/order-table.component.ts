import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewEncapsulation
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import {
  Order,
  OrderAction,
  OrderTableColumn,
  OrderStatus,
  getAvailableActions,
  formatCurrency,
  formatDate,
  getOrderStatusLabel,
  getOrderCommercial,
  getOrderClientName,
} from '../../types/order.types';

export interface OrderTableAction {
  order: Order;
  action: OrderAction;
}

export interface OrderSelectionChange {
  selectedOrders: Order[];
  selectedIds: number[];
}

@Component({
  selector: 'app-order-table',
  templateUrl: './order-table.component.html',
  styleUrls: ['./order-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class OrderTableComponent implements OnChanges {
  @Input() orders: Order[] = [];
  @Input() loading: boolean = false;
  @Input() selectable: boolean = true;
  @Input() showPagination: boolean = true;
  @Input() pageSize: number = 10;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50];
  @Input() columns: OrderTableColumn[] = [];
  @Input() selectedOrderIds: number[] = [];

  @Output() selectionChange = new EventEmitter<OrderSelectionChange>();
  @Output() actionClick = new EventEmitter<OrderTableAction>();
  @Output() rowClick = new EventEmitter<Order>();

  selection = new SelectionModel<Order>(true, []);
  pageIndex = 0;
  readonly OrderAction = OrderAction;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['orders']) {
      this.pageIndex = 0;
      this.updateSelection();
    }

    if (changes['selectedOrderIds']) {
      this.updateSelection();
    }
  }

  get paginatedOrders(): Order[] {
    const start = this.pageIndex * this.pageSize;
    return this.orders.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  private updateSelection(): void {
    this.selection.clear();

    if (this.selectedOrderIds.length > 0) {
      const selectedOrders = this.orders.filter(order =>
        this.selectedOrderIds.includes(order.id)
      );
      selectedOrders.forEach(order => this.selection.select(order));
    }
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.orders.length;
    return numSelected === numRows && numRows > 0;
  }

  isIndeterminate(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.orders.length;
    return numSelected > 0 && numSelected < numRows;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.orders.forEach(row => this.selection.select(row));
    }
    this.emitSelectionChange();
  }

  onRowSelectionChange(order: Order): void {
    this.selection.toggle(order);
    this.emitSelectionChange();
  }

  private emitSelectionChange(): void {
    const selectedOrders = this.selection.selected;
    const selectedIds = selectedOrders.map(order => order.id);

    this.selectionChange.emit({
      selectedOrders,
      selectedIds
    });
  }

  onRowClick(order: Order, event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('input[type="checkbox"]') || target.closest('button')) {
      return;
    }

    this.rowClick.emit(order);
  }

  onActionClick(order: Order, action: OrderAction, event: Event): void {
    event.stopPropagation();
    this.actionClick.emit({ order, action });
  }

  getOrderActions(order: Order): OrderAction[] {
    return getAvailableActions(order.status);
  }

  getActionLabel(action: OrderAction): string {
    const labels = {
      [OrderAction.VIEW]: 'Voir',
      [OrderAction.EDIT]: 'Modifier',
      [OrderAction.DELETE]: 'Supprimer',
      [OrderAction.ACCEPT]: 'Accepter',
      [OrderAction.DENY]: 'Refuser',
      [OrderAction.SELL]: 'Vendre',
      [OrderAction.CANCEL]: 'Annuler'
    };
    return labels[action] || action;
  }

  getActionButtonClass(action: OrderAction): string {
    switch (action) {
      case OrderAction.ACCEPT:
      case OrderAction.SELL:
        return 'btn-success';
      case OrderAction.DELETE:
      case OrderAction.DENY:
      case OrderAction.CANCEL:
        return 'btn-danger';
      default:
        return '';
    }
  }

  formatCellValue(order: Order, column: OrderTableColumn): string {
    const value = (order as any)[column.key];

    switch (column.type) {
      case 'currency':
        return formatCurrency(value);
      case 'date':
        return formatDate(value);
      case 'status':
        return getOrderStatusLabel(value);
      default:
        return value?.toString() || '';
    }
  }

  getStatusBadgeClass(status: OrderStatus): string {
    const classes: Record<string, string> = {
      [OrderStatus.PENDING]: 'status-pending',
      [OrderStatus.ACCEPTED]: 'status-accepted',
      [OrderStatus.SOLD]: 'status-sold',
      [OrderStatus.DENIED]: 'status-denied',
      [OrderStatus.CANCEL]: 'status-cancelled'
    };
    return classes[status] || 'status-default';
  }

  getOrderStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  isSelected(order: Order): boolean {
    return this.selection.isSelected(order);
  }

  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }

  trackByAction(index: number, action: OrderAction): string {
    return action;
  }

  getClientName(order: Order): string {
    return getOrderClientName(order);
  }

  getClientCode(order: Order): string | undefined {
    return order.client?.code;
  }

  getCommercial(order: Order): string {
    return getOrderCommercial(order);
  }
}
