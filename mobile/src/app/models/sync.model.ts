// Modèles pour la synchronisation des données

export interface SyncProgress {
  currentPhase: 'localities' | 'cash-check' | 'clients' | 'updated-clients' | 'updated-photo-clients' | 'updated-photo-url-clients' | 'accounts' | 'distributions' | 'recoveries' | 'orders' | 'tontine-members' | 'tontine-collections' | 'tontine-deliveries' | 'updates' | 'completed';
  currentStep: string;
  totalItems: number;
  processedItems: number;
  percentage: number;
  errors: SyncError[];
  isActive: boolean;
  canCancel: boolean;
}

export interface SyncError {
  id: string;
  entityType: 'locality' | 'client' | 'distribution' | 'recovery' | 'account' | 'order' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery';
  entityId: string;
  entityDisplayName: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPDATE_LOCATION' | 'UPDATE_PHOTO' | 'UPDATE_PHOTO_URL' | 'SKIP';
  errorMessage: string;
  errorCode?: string;
  syncDate: Date;
  retryCount: number;
  canRetry: boolean;
  entityDetails: any;
  requestData?: any;
  responseData?: any;
}

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: SyncError[];
  duration: number;
}

export interface SyncBatchResult {
  localitiesSync: { success: number; errors: number };
  clientsSync: { success: number; errors: number };
  updatedClientsSync: { success: number; errors: number };
  updatedPhotoClientsSync: { success: number; errors: number };
  updatedPhotoUrlClientsSync: { success: number; errors: number };
  distributionsSync: { success: number; errors: number };
  recoveriesSync: { success: number; errors: number };
  accountsSync: { success: number; errors: number };
  ordersSync: { success: number; errors: number };
  tontineMembersSync: { success: number; errors: number };
  tontineCollectionsSync: { success: number; errors: number };
  tontineDeliveriesSync: { success: number; errors: number };
}

export interface IdMapping {
  localId: string;
  serverId: string;
  entityType: 'client' | 'distribution' | 'recovery' | 'account' | 'order' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery';
  syncDate: Date;
}

export interface SyncableEntity {
  id: string;
  isSync: boolean;
  syncDate?: Date;
  serverId?: string;
  isLocal: boolean;
}

export interface SyncStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  errorMessage?: string;
}

// Interfaces pour les APIs de synchronisation

export interface CashDeskStatus {
  isOpened: boolean;
  id?: number;
  systemBalance?: number;
  realBalance?: number;
  status?: string;
  balanceDifference?: number;
  collector?: string;
  accountingDate?: string;
  ticketingJson?: string;
}

export interface ClientSyncRequest {
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
  id: number | null;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonAddress?: string;
  clientType?: 'CLIENT';
  iddoc?: string;
  profilPhoto?: string;
  longitude?: number;
  latitude?: number;
  mll?: string;
  code?: string;
  profilPhotoUrl?: string;
  cardPhotoUrl?: string;
  city?: string;
  status?: string;
  nic?: string;
  profession?: string;
  tontineCollector?: string;
  agencyCollector?: string;
  profilePicture?: string;
  cardPicture?: string;
}

export interface AccountSyncRequest {
  id: null; // Toujours null pour création
  accountNumber: string;
  clientId: number; // ID serveur du client
  accountBalance: number;
  status?: string;
}

export interface AccountUpdateRequest {
  id: number;
  accountNumber: string;
  clientId: number;
  accountBalance: number;
  status: string;
}

export interface DistributionSyncRequest {
  articles: {
    articleEntries: Array<{
      articleId: number;
      quantity: number;
    }>;
  };
  clientId: number; // ID serveur du client
  creditId: number; // ID de la sortie (parent)
  advance: number;
  dailyStake: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalAmountPaid: number;
  totalAmountRemaining: number;
  mobile: boolean;
  reference?: string;
}

export interface OrderSyncRequest {
  clientId: number;
  items: Array<{
    articleId: number;
    quantity: number;
  }>;
}

export interface AccountSyncResponse {
  id: number;
  clientId: number;
  accountNumber: string;
  accountBalance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSyncResponse {
  id: number;
  // Inclure d'autres champs si nécessaire, basés sur la réponse réelle de l'API
}

export interface DistributionSyncResponse {
  id: number;
  clientId: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}


export interface DefaultDailyStakeRequest {
  collector: string;
  stakeUnits: Array<{
    creditId: number; // ID serveur de la distribution
    recoveryId: string; // ID local du recouvrement (mobile)
  }>;
}

export interface SpecialDailyStakeRequest {
  collector: string;
  stakeUnits: Array<{
    amount: number;
    creditId: number; // ID serveur de la distribution
    clientId: number; // ID serveur du client
    recoveryId: string; // ID local du recouvrement (mobile)
  }>;
}

// Types pour la synchronisation manuelle

export interface SyncSelection {
  entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery';
  selectedIds: string[];
  totalCount: number;
  isSelectAll: boolean;
}

export interface PaginationState {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  loading: boolean;
  hasMore: boolean;
}

export interface ManualSyncState {
  clients: SyncSelection;
  distributions: SyncSelection;
  recoveries: SyncSelection;
  tontineMembers: SyncSelection;
  tontineCollections: SyncSelection;
  tontineDeliveries: SyncSelection;
  isLoading: boolean;
  activeTab: 'clients' | 'distributions' | 'recoveries' | 'tontine-members' | 'tontine-collections' | 'tontine-deliveries' | 'all';
  pagination: {
    clients: PaginationState;
    distributions: PaginationState;
    recoveries: PaginationState;
    tontineMembers: PaginationState;
    tontineCollections: PaginationState;
    tontineDeliveries: PaginationState;
  };
}

// Énumérations

export enum SyncPhase {
  CASH_CHECK = 'cash-check',
  CLIENTS = 'clients',
  DISTRIBUTIONS = 'distributions',
  RECOVERIES = 'recoveries',
  UPDATES = 'updates',
  COMPLETED = 'completed'
}

export enum SyncStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export enum EntitySyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  ERROR = 'error'
}

// Interface pour les logs de synchronisation (base de données)
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

// ==================== TONTINE SYNC INTERFACES ====================

export interface TontineMemberSyncRequest {
  clientId: number;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  amount?: number;
  notes?: string;
}

export interface TontineCollectionSyncRequest {
  memberId: number;
  amount: number;
  isDeliveryCollection?: boolean;
  reference?: string;
}

export interface TontineDeliverySyncRequest {
  tontineMemberId: number;
  requestDate: any
  items: TontineDeliveryItemSyncRequest[];
}

export interface TontineDeliveryItemSyncRequest {
  articleId: number;
  quantity: number;
  unitPrice: number;
}

export interface TontineMemberSyncResponse {
  id: number;
  clientId: number;
  tontineSessionId: number;
  totalContribution: number;
  deliveryStatus: string;
  registrationDate: string;
}

export interface TontineCollectionSyncResponse {
  id: number;
  memberId: number;
  amount: number;
  collectionDate: string;
}

export interface TontineDeliverySyncResponse {
  id: number;
  tontineMemberId: number;
  totalAmount: number;
  status: string;
  requestDate: string;
}
