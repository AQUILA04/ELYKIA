// Types TypeScript pour le module Tontine Management
// Basé sur la spécification UX et l'API backend

export interface TontineSession {
  readonly id: number;
  readonly year: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: TontineSessionStatus;
  readonly createdBy?: string;
  readonly createdDate?: string;
  readonly lastModifiedBy?: string;
  readonly lastModifiedDate?: string;
  readonly memberCount?: number;
  readonly totalCollected?: number;
  readonly totalRevenue?: number;
}

export interface TontineMember {
  readonly id: number;
  readonly tontineSession: TontineSession;
  readonly client: TontineClient;
  readonly totalContribution: number;
  readonly deliveryStatus: TontineMemberDeliveryStatus;
  readonly registrationDate: string;
  readonly delivery?: TontineDelivery;
  readonly createdBy?: string;
  readonly createdDate?: string;
  readonly frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  readonly amount?: number;
  readonly notes?: string;
  readonly societyShare?: number;
  readonly availableContribution?: number;
  readonly validatedMonths?: number;
  readonly currentMonthDays?: number;
}

export interface TontineCollection {
  readonly id: number;
  readonly tontineMember: TontineMember;
  readonly amount: number;
  readonly collectionDate: string;
  readonly commercialUsername: string;
  readonly createdBy?: string;
  readonly createdDate?: string;
}

export interface TontineClient {
  readonly id: number;
  readonly code?: string;
  readonly firstname: string;
  readonly lastname: string;
  readonly phone?: string;
  readonly address?: string;
  readonly fullName?: string;
}

export interface TontineDelivery {
  readonly id: number;
  readonly tontineMemberId?: number;
  readonly deliveryStatus: TontineMemberDeliveryStatus;
  readonly clientName?: string;
  readonly tontineMember?: TontineMember;
  readonly deliveryDate: string;
  readonly totalAmount: number;
  readonly remainingBalance: number;
  readonly commercialUsername: string;
  readonly items: readonly TontineDeliveryItem[];
  readonly createdBy?: string;
  readonly createdDate?: string;
}

export interface TontineDeliveryItem {
  readonly id: number;
  readonly deliveryId: number;
  readonly articleId: number;
  readonly articleName: string;
  readonly articleCode?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
}

export interface Article {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly sellingPrice: number;
  readonly active: boolean;
}

// Enums
export enum TontineSessionStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ENDED = 'ENDED'
}

export enum TontineMemberDeliveryStatus {
  SESSION_INPROGRESS = 'SESSION_INPROGRESS',
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  DELIVERED = 'DELIVERED'
}

// DTOs pour les API calls
export interface CreateTontineMemberDto {
  readonly clientId: number;
  readonly frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  readonly amount?: number;
  readonly notes?: string;
}

export interface CreateTontineCollectionDto {
  readonly memberId: number;
  readonly amount: number;
}

export interface UpdateSessionDto {
  readonly startDate: string;
  readonly endDate: string;
}

export interface CreateDeliveryDto {
  readonly tontineMemberId: number;
  readonly items: DeliveryItemDto[];
}

export interface DeliveryItemDto {
  readonly articleId: number;
  readonly quantity: number;
  readonly unitPrice: number;
}

// Interfaces pour les filtres
export interface TontineFilters {
  year?: number;
  sessionId?: number;
  commercial?: string;
  deliveryStatus?: TontineMemberDeliveryStatus;
  searchTerm?: string;
}

// Statistiques de session
export interface SessionStats {
  readonly sessionId: number;
  readonly year: number;
  readonly totalMembers: number;
  readonly totalCollected: number;
  readonly averageContribution: number;
  readonly deliveredCount: number;
  readonly pendingCount: number;
  readonly deliveryRate: number;
  readonly totalRevenue: number; // Added totalRevenue
  readonly topCommercials?: readonly TopCommercial[];
}

export interface TopCommercial {
  readonly username: string;
  readonly memberCount: number;
  readonly totalCollected: number;
}

export interface SessionComparison {
  readonly sessions: readonly SessionStats[];
  readonly comparisonMetrics: ComparisonMetrics;
}

export interface ComparisonMetrics {
  readonly memberGrowth: number;
  readonly collectionGrowth: number;
  readonly bestYear: number;
  readonly worstYear: number;
}

// Interfaces pour la pagination
export interface ApiResponse<T> {
  readonly status: string;
  readonly statusCode: number;
  readonly message: string;
  readonly service: string;
  readonly data: T | null;
}

export interface PaginatedResponse<T> {
  readonly content: readonly T[];
  readonly page: {
    readonly size: number;
    readonly number: number;
    readonly totalElements: number;
    readonly totalPages: number;
  }
}

// Interface for query parameters to send to the backend
export interface TontineMemberQueryParams {
  page?: number;
  size?: number;
  sort?: string; // e.g., "client.lastname,asc" or ["client.lastname,asc", "id,desc"]
  search?: string;
  deliveryStatus?: TontineMemberDeliveryStatus;
  commercial?: string;
}

// Interface for parameters emitted by the filter bar component
export interface TontineFilterBarParams {
  search?: string;
  deliveryStatus?: TontineMemberDeliveryStatus | 'ALL';
  commercial?: string;
}

// KPIs
export interface TontineKPI {
  readonly totalMembers: number;
  readonly totalCollected: number;
  readonly totalRevenue: number;
  readonly pendingDeliveries: number;
  readonly completedDeliveries: number;
  readonly averageContribution: number;
  readonly monthlyGrowth: number;
}

// Configuration des KPIs
export interface KPICardConfig {
  readonly title: string;
  readonly value: string | number;
  readonly icon: string;
  readonly color: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'accent';
  readonly subtitle?: string;
}

// État de l'application Tontine
export interface TontineState {
  readonly members: readonly TontineMember[];
  readonly filteredMembers: readonly TontineMember[];
  readonly filters: TontineFilters;
  // readonly pagination: TontinePaginationConfig; // Removed
  readonly loading: boolean;
  readonly error: string | null;
  readonly kpis: TontineKPI | null;
  readonly currentSession: TontineSession | null;
}

// Constantes
export const TONTINE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_COLLECTION_AMOUNT: 100,
  MAX_COLLECTION_AMOUNT: 1000000,
  CURRENCY_CODE: 'XOF',
  DATE_FORMAT: 'dd/MM/yyyy',
  DATETIME_FORMAT: 'dd/MM/yyyy HH:mm'
} as const;

// Messages de validation
export const TONTINE_VALIDATION_MESSAGES = {
  CLIENT_REQUIRED: 'Veuillez sélectionner un client',
  AMOUNT_REQUIRED: 'Veuillez saisir un montant',
  AMOUNT_MIN: `Le montant minimum est de ${TONTINE_CONSTANTS.MIN_COLLECTION_AMOUNT} ${TONTINE_CONSTANTS.CURRENCY_CODE}`,
  AMOUNT_MAX: `Le montant maximum est de ${TONTINE_CONSTANTS.MAX_COLLECTION_AMOUNT} ${TONTINE_CONSTANTS.CURRENCY_CODE}`,
  MEMBER_ALREADY_EXISTS: 'Ce client est déjà inscrit à la session en cours',
  MEMBER_NOT_FOUND: 'Membre non trouvé',
  SESSION_NOT_FOUND: 'Session non trouvée',
  DATE_INVALID: 'Date invalide'
} as const;



// Labels des statuts de livraison
export const TONTINE_DELIVERY_STATUS_LABELS = {
  [TontineMemberDeliveryStatus.SESSION_INPROGRESS]: 'Session en cours',
  [TontineMemberDeliveryStatus.PENDING]: 'En attente',
  [TontineMemberDeliveryStatus.VALIDATED]: 'Validée',
  [TontineMemberDeliveryStatus.DELIVERED]: 'Livrée'
} as const;

// Couleurs des statuts de livraison
export const TONTINE_DELIVERY_STATUS_COLORS = {
  [TontineMemberDeliveryStatus.SESSION_INPROGRESS]: 'info',
  [TontineMemberDeliveryStatus.PENDING]: 'warning',
  [TontineMemberDeliveryStatus.VALIDATED]: 'accent',
  [TontineMemberDeliveryStatus.DELIVERED]: 'success'
} as const;

// Utilitaires
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: TONTINE_CONSTANTS.CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) {
    return '';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(dateString));
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) {
    return '';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};

export const getDeliveryStatusLabel = (status: TontineMemberDeliveryStatus): string => {
  return TONTINE_DELIVERY_STATUS_LABELS[status] || status;
};

export const getDeliveryStatusColor = (status: TontineMemberDeliveryStatus): string => {
  return TONTINE_DELIVERY_STATUS_COLORS[status] || 'secondary';
};

export const validateCollectionAmount = (amount: number): boolean => {
  return amount >= TONTINE_CONSTANTS.MIN_COLLECTION_AMOUNT &&
    amount <= TONTINE_CONSTANTS.MAX_COLLECTION_AMOUNT;
};

export const getClientFullName = (client: TontineClient): string => {
  return `${client.firstname} ${client.lastname}`.trim();
};
