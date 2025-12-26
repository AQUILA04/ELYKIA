import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnChanges, 
  SimpleChanges,
  ViewChild,
  ChangeDetectionStrategy 
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
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
  getOrderStatusColor
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderTableComponent implements OnInit, OnChanges {
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
  @Output() sortChange = new EventEmitter<{field: string, direction: 'asc' | 'desc'}>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<Order>();
  selection = new SelectionModel<Order>(true, []);
  displayedColumns: string[] = [];

  // Colonnes par défaut
  defaultColumns: OrderTableColumn[] = [
    { key: 'selection', label: '', sortable: false, type: 'checkbox', width: '48px' },
    { key: 'id', label: 'N° Commande', sortable: true, type: 'text', width: '120px' },
    { key: 'clientName', label: 'Client', sortable: true, type: 'text' },
    { key: 'commercial', label: 'Commercial', sortable: true, type: 'text' },
    { key: 'orderDate', label: 'Date', sortable: true, type: 'date', width: '120px' },
    { key: 'totalAmount', label: 'Montant', sortable: true, type: 'currency', width: '140px' },
    { key: 'status', label: 'Statut', sortable: true, type: 'status', width: '120px' },
    { key: 'actions', label: 'Actions', sortable: false, type: 'actions', width: '120px' }
  ];

  ngOnInit(): void {
    this.initializeColumns();
    this.setupDataSource();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['orders']) {
      this.dataSource.data = this.orders;
      this.updateSelection();
    }

    if (changes['selectedOrderIds']) {
      this.updateSelection();
    }

    if (changes['columns']) {
      this.initializeColumns();
    }
  }

  /**
   * Initialise les colonnes à afficher
   */
  private initializeColumns(): void {
    const columnsToUse = this.columns.length > 0 ? this.columns : this.defaultColumns;
    
    // Filtrer les colonnes selon les options
    let filteredColumns = columnsToUse;
    
    if (!this.selectable) {
      filteredColumns = filteredColumns.filter(col => col.key !== 'selection');
    }

    this.displayedColumns = filteredColumns.map(col => col.key as string);
  }

  /**
   * Configure la source de données avec tri et pagination
   */
  private setupDataSource(): void {
    this.dataSource.data = this.orders;
    
    // Configuration du tri personnalisé
    this.dataSource.sortingDataAccessor = (order: Order, property: string) => {
      switch (property) {
        case 'orderDate':
          return new Date(order.orderDate).getTime();
        case 'totalAmount':
          return order.totalAmount;
        case 'clientName':
          return (order.client?.fullName || `${order.client?.firstname} ${order.client?.lastname}`).toLowerCase();
        case 'commercial':
          return (order.commercial || '').toLowerCase();
        case 'status':
          return order.status;
        default:
          return (order as any)[property];
      }
    };

    // Configuration du trackBy pour les performances
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  /**
   * Met à jour la sélection basée sur les IDs fournis
   */
  private updateSelection(): void {
    this.selection.clear();
    
    if (this.selectedOrderIds.length > 0) {
      const selectedOrders = this.orders.filter(order => 
        this.selectedOrderIds.includes(order.id)
      );
      selectedOrders.forEach(order => this.selection.select(order));
    }
  }

  /**
   * Vérifie si toutes les lignes sont sélectionnées
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  /**
   * Vérifie s'il y a une sélection partielle
   */
  isIndeterminate(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected > 0 && numSelected < numRows;
  }

  /**
   * Sélectionne/désélectionne toutes les lignes
   */
  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
    }
    this.emitSelectionChange();
  }

  /**
   * Gère le changement de sélection d'une ligne
   */
  onRowSelectionChange(order: Order): void {
    this.selection.toggle(order);
    this.emitSelectionChange();
  }

  /**
   * Émet l'événement de changement de sélection
   */
  private emitSelectionChange(): void {
    const selectedOrders = this.selection.selected;
    const selectedIds = selectedOrders.map(order => order.id);
    
    this.selectionChange.emit({
      selectedOrders,
      selectedIds
    });
  }

  /**
   * Gère le clic sur une ligne
   */
  onRowClick(order: Order, event: Event): void {
    // Empêcher la propagation si on clique sur une case à cocher ou un bouton
    const target = event.target as HTMLElement;
    if (target.closest('mat-checkbox') || target.closest('button') || target.closest('.mat-mdc-menu-trigger')) {
      return;
    }

    this.rowClick.emit(order);
  }

  /**
   * Gère le clic sur une action
   */
  onActionClick(order: Order, action: OrderAction, event: Event): void {
    event.stopPropagation();
    this.actionClick.emit({ order, action });
  }

  /**
   * Gère le changement de tri
   */
  onSortChange(): void {
    if (this.sort.active && this.sort.direction) {
      this.sortChange.emit({
        field: this.sort.active,
        direction: this.sort.direction
      });
    }
  }

  /**
   * Retourne les actions disponibles pour une commande
   */
  getOrderActions(order: Order): OrderAction[] {
    return getAvailableActions(order.status);
  }

  /**
   * Retourne le label d'une action
   */
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

  /**
   * Retourne l'icône d'une action
   */
  getActionIcon(action: OrderAction): string {
    const icons = {
      [OrderAction.VIEW]: 'visibility',
      [OrderAction.EDIT]: 'edit',
      [OrderAction.DELETE]: 'delete',
      [OrderAction.ACCEPT]: 'check',
      [OrderAction.DENY]: 'close',
      [OrderAction.SELL]: 'monetization_on',
      [OrderAction.CANCEL]: 'cancel'
    };
    return icons[action] || 'more_vert';
  }

  /**
   * Formate une valeur selon son type de colonne
   */
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

  /**
   * Retourne la classe CSS pour le statut
   */
  getStatusClass(status: OrderStatus): string {
    return `status-badge status-badge--${getOrderStatusColor(status)}`;
  }

  /**
   * Vérifie si une colonne doit être affichée
   */
  shouldShowColumn(columnKey: string): boolean {
    return this.displayedColumns.includes(columnKey);
  }

  /**
   * Retourne le nombre total d'éléments sélectionnés
   */
  getSelectionCount(): number {
    return this.selection.selected.length;
  }

  /**
   * Vérifie si une ligne est sélectionnée
   */
  isSelected(order: Order): boolean {
    return this.selection.isSelected(order);
  }

  /**
   * TrackBy function pour les lignes du tableau
   */
  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }

  /**
   * TrackBy function pour les actions
   */
  trackByAction(index: number, action: OrderAction): string {
    return action;
  }

  /**
   * Retourne le nom complet du client
   */
  getClientName(order: Order): string {
    return order.client?.fullName || `${order.client?.firstname || ''} ${order.client?.lastname || ''}`.trim();
  }

  /**
   * Retourne le code du client
   */
  getClientCode(order: Order): string | undefined {
    return order.client?.code;
  }

  /**
   * Retourne le nom du commercial
   */
  getCommercial(order: Order): string {
    return order.commercial || '-';
  }
}