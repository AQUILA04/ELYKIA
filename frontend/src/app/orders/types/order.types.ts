// Types TypeScript pour le module Order Management
// Basé sur la spécification UX et les besoins fonctionnels

export interface Order {
  readonly id: number;
  readonly client: {
    readonly id: number;
    readonly firstname: string;
    readonly lastname: string;
    readonly fullName: string;
    readonly code?: string;
    readonly phone?: string;
    readonly address?: string;
  };
  readonly orderDate: string; // Format ISO: "2025-10-09T01:48:14.127181"
  readonly totalAmount: number;
  readonly totalPurchasePrice?: number;
  readonly status: OrderStatus;
  readonly items?: readonly OrderItem[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly createdBy?: string;
  readonly commercial?: string; // Peut être ajouté plus tard par l'API
}

export interface OrderItem {
  readonly id: number;
  readonly orderId: number;
  readonly articleId: number;
  readonly articleName: string;
  readonly articleCode?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
}

export interface OrderStatusHistory {
  readonly id: number;
  readonly orderId: number;
  readonly oldStatus: OrderStatus;
  readonly newStatus: OrderStatus;
  readonly changeTimestamp: string;
  readonly changedBy: string;
  readonly notes?: string;
}

export interface OrderKPI {
  readonly pendingOrders: number;
  readonly potentialValue: number;
  readonly acceptanceRate: number;
  readonly acceptedPipelineValue: number;
  readonly potentialProfit: number;
  readonly totalOrders: number;
  readonly monthlyGrowth: number;
}

export interface OrderClient {
  readonly id: number;
  readonly code?: string;
  readonly firstname: string;
  readonly lastname: string;
  readonly phone?: string;
  readonly address?: string;
  readonly cardID?: string;
  readonly cardType?: string;
  readonly occupation?: string;
  readonly quarter?: string;
  readonly isActive?: boolean;
  readonly creditInProgress?: boolean;
}

export interface OrderArticle {
  readonly id: number;
  readonly code?: string;
  readonly name: string;
  readonly commercialName?: string;
  readonly marque?: string;
  readonly model?: string;
  readonly type?: string;
  readonly description?: string;
  readonly unitPrice: number;
  readonly purchasePrice?: number;
  readonly sellingPrice?: number;
  readonly creditSalePrice?: number;
  readonly isActive?: boolean;
  readonly category?: string;
}

// Enums
export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DENIED = 'DENIED',
  CANCEL = 'CANCEL',
  SOLD = 'SOLD'
}

export enum OrderAction {
  VIEW = 'view',
  EDIT = 'edit',
  DELETE = 'delete',
  ACCEPT = 'accept',
  DENY = 'deny',
  SELL = 'sell',
  CANCEL = 'cancel'
}

// DTOs pour les API calls
export interface CreateOrderDto {
  readonly clientId: number;
  readonly items: readonly CreateOrderItemDto[];
}

export interface CreateOrderItemDto {
  readonly articleId: number;
  readonly quantity: number;
}

export interface UpdateOrderDto {
  readonly clientId?: number;
  readonly items?: readonly CreateOrderItemDto[];
}

export interface UpdateOrderStatusDto {
  readonly orderIds: readonly number[];
  readonly newStatus: OrderStatus;
}

// Interfaces pour les filtres et la recherche
export interface OrderFilters {
  status?: OrderStatus;
  clientName?: string;
  commercial?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
}

export interface OrderTableColumn {
  readonly key: keyof Order | 'actions' | 'selection' | 'clientName';
  readonly label: string;
  readonly sortable: boolean;
  readonly type: 'text' | 'currency' | 'date' | 'status' | 'actions' | 'checkbox';
  readonly width?: string;
}

// Interface pour la pagination
export interface OrderPaginationConfig {
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

// Interface pour le tri
export interface OrderSortConfig {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

// Réponses API
export interface ApiResponse<T> {
  readonly status: string;
  readonly statusCode: number;
  readonly message: string;
  readonly service: string;
  readonly data: T | null;
}

export interface PaginatedResponse<T> {
  readonly content: readonly T[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly size: number;
  readonly number: number;
  readonly first: boolean;
  readonly last: boolean;
}

// Configuration des KPIs
export interface KPICardConfig {
  readonly title: string;
  readonly value: string | number;
  readonly icon: string;
  readonly color: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  readonly trend?: {
    readonly value: number;
    readonly direction: 'up' | 'down';
    readonly label: string;
  };
  readonly subtitle?: string;
}

// Configuration des onglets de statut
export interface StatusTabConfig {
  readonly status: OrderStatus | 'ALL';
  readonly label: string;
  readonly icon: string;
  readonly color: string;
  readonly count?: number;
}

// État de l'application Order
export interface OrderState {
  readonly orders: readonly Order[];
  readonly filteredOrders: readonly Order[];
  readonly filters: OrderFilters;
  readonly pagination: OrderPaginationConfig;
  readonly sort: OrderSortConfig;
  readonly loading: boolean;
  readonly error: string | null;
  readonly kpis: OrderKPI | null;
  readonly selectedOrders: readonly number[];
  readonly currentTab: OrderStatus | 'ALL';
}

// Constantes
export const ORDER_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_ORDER_AMOUNT: 1000, // 1000 XOF minimum
  MAX_ORDER_AMOUNT: 10000000, // 10M XOF maximum
  CURRENCY_CODE: 'XOF',
  DATE_FORMAT: 'dd/MM/yyyy',
  DATETIME_FORMAT: 'dd/MM/yyyy HH:mm'
} as const;

// Messages de validation
export const ORDER_VALIDATION_MESSAGES = {
  CLIENT_REQUIRED: 'Veuillez sélectionner un client',
  ITEMS_REQUIRED: 'Veuillez ajouter au moins un article',
  QUANTITY_MIN: 'La quantité doit être supérieure à 0',
  QUANTITY_MAX: 'Quantité maximale dépassée',
  AMOUNT_INVALID: 'Montant invalide',
  AMOUNT_MIN: `Le montant minimum est de ${ORDER_CONSTANTS.MIN_ORDER_AMOUNT} ${ORDER_CONSTANTS.CURRENCY_CODE}`,
  AMOUNT_MAX: `Le montant maximum est de ${ORDER_CONSTANTS.MAX_ORDER_AMOUNT} ${ORDER_CONSTANTS.CURRENCY_CODE}`,
  STATUS_TRANSITION_INVALID: 'Changement de statut non autorisé',
  SELECTION_REQUIRED: 'Veuillez sélectionner au moins une commande',
  ORDER_NOT_FOUND: 'Commande non trouvée',
  ORDER_CANNOT_BE_MODIFIED: 'Cette commande ne peut pas être modifiée dans son état actuel'
} as const;

// Labels des statuts
export const ORDER_STATUS_LABELS = {
  [OrderStatus.PENDING]: 'En Attente',
  [OrderStatus.ACCEPTED]: 'Acceptée',
  [OrderStatus.DENIED]: 'Refusée',
  [OrderStatus.CANCEL]: 'Annulée',
  [OrderStatus.SOLD]: 'Vendue'
} as const;

// Couleurs des statuts
export const ORDER_STATUS_COLORS = {
  [OrderStatus.PENDING]: 'warning',
  [OrderStatus.ACCEPTED]: 'primary',
  [OrderStatus.DENIED]: 'danger',
  [OrderStatus.CANCEL]: 'secondary',
  [OrderStatus.SOLD]: 'success'
} as const;

// Configuration des onglets par défaut
export const DEFAULT_STATUS_TABS: StatusTabConfig[] = [
  {
    status: OrderStatus.PENDING,
    label: 'En Attente',
    icon: 'schedule',
    color: 'warning'
  },
  {
    status: OrderStatus.ACCEPTED,
    label: 'Acceptées',
    icon: 'check_circle',
    color: 'primary'
  },
  {
    status: OrderStatus.SOLD,
    label: 'Vendues',
    icon: 'monetization_on',
    color: 'success'
  },
  {
    status: 'ALL' as OrderStatus,
    label: 'Autres',
    icon: 'more_horiz',
    color: 'secondary'
  }
];

// Type guards pour la validation runtime
export const isOrder = (obj: any): obj is Order => {
  return obj &&
    typeof obj.id === 'number' &&
    typeof obj.clientId === 'number' &&
    typeof obj.clientName === 'string' &&
    typeof obj.commercial === 'string' &&
    typeof obj.totalAmount === 'number' &&
    Object.values(OrderStatus).includes(obj.status);
};

export const isOrderItem = (obj: any): obj is OrderItem => {
  return obj &&
    typeof obj.id === 'number' &&
    typeof obj.orderId === 'number' &&
    typeof obj.articleId === 'number' &&
    typeof obj.quantity === 'number' &&
    typeof obj.unitPrice === 'number';
};

// Utilitaires de validation
export const validateOrderAmount = (amount: number): boolean => {
  return amount >= ORDER_CONSTANTS.MIN_ORDER_AMOUNT && 
         amount <= ORDER_CONSTANTS.MAX_ORDER_AMOUNT;
};

export const validateQuantity = (quantity: number): boolean => {
  return quantity > 0 && Number.isInteger(quantity);
};

export const canModifyOrder = (status: OrderStatus): boolean => {
  return status === OrderStatus.PENDING;
};

export const canDeleteOrder = (status: OrderStatus): boolean => {
  return status === OrderStatus.PENDING || status === OrderStatus.DENIED;
};

export const canAcceptOrder = (status: OrderStatus): boolean => {
  return status === OrderStatus.PENDING;
};

export const canSellOrder = (status: OrderStatus): boolean => {
  return status === OrderStatus.ACCEPTED;
};

export const getAvailableActions = (status: OrderStatus): OrderAction[] => {
  const actions: OrderAction[] = [OrderAction.VIEW];
  
  if (canModifyOrder(status)) {
    actions.push(OrderAction.EDIT);
  }
  
  if (canDeleteOrder(status)) {
    actions.push(OrderAction.DELETE);
  }
  
  if (canAcceptOrder(status)) {
    actions.push(OrderAction.ACCEPT, OrderAction.DENY);
  }
  
  if (canSellOrder(status)) {
    actions.push(OrderAction.SELL);
  }
  
  if (status !== OrderStatus.CANCEL && status !== OrderStatus.SOLD && status !== OrderStatus.ACCEPTED) {
    actions.push(OrderAction.CANCEL);
  }
  
  return actions;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: ORDER_CONSTANTS.CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(dateString));
};

export const formatDateTime = (dateString: string): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};

export const getOrderStatusLabel = (status: OrderStatus): string => {
  return ORDER_STATUS_LABELS[status] || status;
};

export const getOrderStatusColor = (status: OrderStatus): string => {
  return ORDER_STATUS_COLORS[status] || 'secondary';
};

export const calculateOrderTotal = (items: OrderItem[]): number => {
  return items.reduce((total, item) => total + item.totalPrice, 0);
};

export const calculateItemTotal = (quantity: number, unitPrice: number): number => {
  return quantity * unitPrice;
};