// Modèles pour les réponses des APIs de synchronisation

export interface ApiResponse<T> {
  status: string;
  statusCode: number;
  message: string;
  service: string;
  data: T;
}

export interface CashDeskStatusResponse {
  id: number;
  systemBalance: number;
  realBalance: number;
  status: string;
  balanceDifference: number;
  collector: string;
  accountingDate: string;
  ticketingJson: string;
  isOpened: boolean;
}

export interface ClientSyncResponse {
  id: number;
  address: string;
  cardID: string;
  cardType: string;
  collector: string;
  dateOfBirth: string;
  firstname: string;
  lastname: string;
  occupation: string;
  phone: string;
  quarter: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonAddress?: string;
  clientType: string;
  iddoc?: string;
  profilPhoto?: string;
  longitude?: number;
  latitude?: number;
  mll?: string;
  code: string;
  fullName: string;
  accountId?: number;
  profilPhotoUrl?: string;
  cardPhotoUrl?: string;
}

export interface AccountSyncResponse {
  id: number;
  accountNumber: string;
  clientId: number;
  accountBalance: number;
  status: string; // CREATED, ACTIF, CLOSED
}

export interface DistributionSyncResponse {
  id: number;
  client: {
    id: number;
    firstname: string;
    lastname: string;
    address: string;
    phone: string;
    cardID: string;
    cardType: string;
    dateOfBirth: string;
    contactPersonName: string;
    contactPersonPhone: string;
    contactPersonAddress: string;
    collector: string;
    quarter: string;
    creditInProgress: boolean;
    occupation: string;
    clientType: string;
    fullName: string;
    accountId: number;
  };
  articles: Array<{
    id: number;
    articles: {
      id: number;
      purchasePrice: number;
      sellingPrice: number;
      creditSalePrice: number;
      name: string;
      marque: string;
      model: string;
      type: string;
      stockQuantity: number;
      commercialName: string;
    };
    quantity: number;
    creditId: number;
    articlesId: number;
  }>;
  beginDate: string;
  expectedEndDate: string;
  effectiveEndDate?: string;
  solvencyNote: string;
  lateDaysCount: number;
  totalAmount: number;
  totalAmountPaid: number;
  totalAmountRemaining: number;
  dailyStake: number;
  status: string;
  remainingDaysCount: number;
  collector: string;
  type: string;
  dailyPaid: boolean;
  clientType: string;
  parent?: any;
  updatable: boolean;
  reference: string;
  clientId: number;
  promoterCredit: boolean;
}

export interface DailyStakeSyncResponse {
  // Retourne un tableau d'IDs des mises enregistrées
  data: number[];
}

// Types d'erreur API
export interface ApiError {
  status: string;
  statusCode: number;
  message: string;
  service: string;
  data: null;
  timestamp?: string;
  path?: string;
}

// Réponses paginées (pour les futures extensions)
export interface PaginatedResponse<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

// Types pour les logs de synchronisation
export interface SyncLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  status: 'SUCCESS' | 'ERROR' | 'PENDING' | 'RETRYING';
  errorMessage?: string;
  errorCode?: string;
  requestData?: string; // JSON stringifié
  responseData?: string; // JSON stringifié
  syncDate: string;
  retryCount: number;
  lastRetryDate?: string;
  resolvedDate?: string;
  entityDisplayName: string;
  entityDetails: string; // JSON stringifié
}