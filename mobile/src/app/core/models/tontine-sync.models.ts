import { Observable } from 'rxjs';

// ============================================================================
// Enumerations
// ============================================================================

/**
 * Statut d'une session de synchronisation
 */
export enum SyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Types d'erreur de synchronisation
 */
export enum SyncErrorType {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  TIMEOUT = 'TIMEOUT'
}

// ============================================================================
// Types de Base
// ============================================================================

/**
 * Options de configuration pour une synchronisation
 */
export interface SyncOptions {
  /** Force le nettoyage des données avant synchronisation */
  forceCleanup: boolean;
  /** ID de session tontine (optionnel) */
  sessionId?: string;
  /** Nom d'utilisateur du commercial */
  commercialUsername: string;
  /** Taille des batches pour le traitement */
  batchSize: number;
}

/**
 * Résultat d'une synchronisation complète
 */
export interface SyncResult {
  /** Indique si la synchronisation a réussi */
  success: boolean;
  /** Nombre total de membres synchronisés */
  totalMembers: number;
  /** Nombre total de collections synchronisées */
  totalCollections: number;
  /** Nombre total de stocks synchronisés */
  totalStocks: number;
  /** Liste des erreurs rencontrées */
  errors: SyncError[];
  /** Durée de la synchronisation en millisecondes */
  duration: number;
}

/**
 * Contexte d'une opération de synchronisation
 */
export interface SyncContext {
  /** ID de la session de synchronisation */
  sessionId: string;
  /** Nom d'utilisateur du commercial */
  commercialUsername: string;
  /** Étape actuelle de la synchronisation */
  currentStep: string;
  /** Page en cours de traitement */
  currentPage?: number;
  /** Timestamp de l'opération */
  timestamp: Date;
}

/**
 * Erreur de synchronisation
 */
export interface SyncError {
  /** Type d'erreur */
  type: SyncErrorType;
  /** Message d'erreur */
  message: string;
  /** Contexte de l'erreur */
  context: SyncContext;
  /** Timestamp de l'erreur */
  timestamp: Date;
  /** Indique si l'opération peut être retentée */
  retryable: boolean;
}

/**
 * Session de synchronisation
 */
export interface SyncSession {
  /** ID unique de la session */
  id: string;
  /** Nom d'utilisateur du commercial */
  commercialUsername: string;
  /** ID de session tontine */
  sessionId: string;
  /** Date/heure de début */
  startTime: Date;
  /** Date/heure de fin (optionnel) */
  endTime?: Date;
  /** Statut actuel de la session */
  status: SyncStatus;
  /** Progression de la synchronisation */
  progress: SyncProgress;
  /** Résultat de la synchronisation (si terminée) */
  result?: SyncResult;
}

/**
 * Progression d'une synchronisation
 */
export interface SyncProgress {
  /** Étape actuelle */
  currentStep: string;
  /** Nombre total d'étapes */
  totalSteps: number;
  /** Nombre d'étapes complétées */
  completedSteps: number;
  /** Progression de la page actuelle */
  currentPageProgress: PageProgress;
}

/**
 * Progression du traitement d'une page
 */
export interface PageProgress {
  /** Page actuelle */
  currentPage: number;
  /** Nombre total de pages */
  totalPages: number;
  /** Nombre d'éléments traités */
  itemsProcessed: number;
  /** Nombre total d'éléments */
  totalItems: number;
}

// ============================================================================
// Résultats de Synchronisation Spécifiques
// ============================================================================

/**
 * Résultat de synchronisation paginée (base)
 */
export interface PaginatedSyncResult {
  /** Nombre total de pages */
  totalPages: number;
  /** Nombre de pages traitées */
  processedPages: number;
  /** Nombre total d'éléments */
  totalItems: number;
  /** Nombre d'éléments sauvegardés */
  savedItems: number;
  /** Liste des erreurs */
  errors: SyncError[];
}

/**
 * Résultat de synchronisation des membres
 */
export interface MembersSyncResult extends PaginatedSyncResult {
  /** ID de session tontine */
  sessionId: string;
}

/**
 * Résultat de synchronisation des collections
 */
export interface CollectionsSyncResult extends PaginatedSyncResult {
  /** Nombre de membres traités */
  membersProcessed: number;
}

/**
 * Résultat de synchronisation des stocks
 */
export interface StocksSyncResult extends PaginatedSyncResult {
  /** ID de session tontine */
  sessionId: string;
}

/**
 * Résultat de nettoyage des données
 */
export interface CleanupResult {
  /** Nombre de membres supprimés */
  membersDeleted: number;
  /** Nombre de collections supprimées */
  collectionsDeleted: number;
  /** Nombre de stocks supprimés */
  stocksDeleted: number;
  /** Indique si le nettoyage a réussi */
  success: boolean;
}

// ============================================================================
// Validation d'Intégrité
// ============================================================================

/**
 * Données attendues pour validation
 */
export interface ExpectedData {
  /** Nombre de membres attendus */
  memberCount: number;
  /** Nombre de collections attendues */
  collectionCount: number;
  /** Nombre de stocks attendus */
  stockCount: number;
}

/**
 * Données réelles pour validation
 */
export interface ActualData {
  /** Nombre de membres réels */
  memberCount: number;
  /** Nombre de collections réelles */
  collectionCount: number;
  /** Nombre de stocks réels */
  stockCount: number;
}

/**
 * Résultat de validation d'intégrité
 */
export interface ValidationResult {
  /** Indique si la validation a réussi */
  isValid: boolean;
  /** Nombre d'éléments attendus */
  expectedCount: number;
  /** Nombre d'éléments réels */
  actualCount: number;
  /** Liste des éléments manquants */
  missingItems: string[];
  /** Liste des éléments corrompus */
  corruptedItems: string[];
  /** Indique si les checksums correspondent */
  checksumMatch: boolean;
}

/**
 * Résultat de validation de structure
 */
export interface StructureValidationResult {
  /** Indique si la structure est valide */
  isValid: boolean;
  /** Liste des erreurs de structure */
  errors: string[];
  /** Nombre d'éléments validés */
  validatedCount: number;
}

/**
 * Résultat de gestion d'erreur
 */
export interface ErrorHandlingResult {
  /** Indique si l'erreur a été gérée avec succès */
  handled: boolean;
  /** Indique si un retry doit être effectué */
  shouldRetry: boolean;
  /** Indique si un rollback doit être effectué */
  shouldRollback: boolean;
  /** Message pour l'utilisateur */
  userMessage: string;
}

// ============================================================================
// Métadonnées et Points de Restauration
// ============================================================================

/**
 * Métadonnées de synchronisation
 */
export interface SyncMetadata {
  /** Date de la dernière synchronisation */
  lastSyncDate: Date;
  /** Date de la dernière synchronisation réussie */
  lastSuccessfulSync: Date;
  /** Version du système de synchronisation */
  syncVersion: string;
  /** Checksum des données */
  dataChecksum: string;
  /** Nombre total d'éléments synchronisés */
  totalItemsSynced: number;
  /** Durée de la synchronisation en millisecondes */
  syncDuration: number;
}

/**
 * Snapshot de données pour restauration
 */
export interface DataSnapshot {
  /** Données des membres */
  members: any[];
  /** Données des collections */
  collections: any[];
  /** Données des stocks */
  stocks: any[];
  /** Timestamp du snapshot */
  timestamp: Date;
}

/**
 * Point de restauration
 */
export interface RestorePoint {
  /** ID unique du point de restauration */
  id: string;
  /** Timestamp de création */
  timestamp: Date;
  /** Snapshot des données */
  dataSnapshot: DataSnapshot;
  /** Métadonnées de synchronisation */
  metadata: SyncMetadata;
}

// ============================================================================
// Interfaces de Services
// ============================================================================

/**
 * Interface pour l'orchestrateur de synchronisation
 * Responsabilité: Coordonner l'ensemble du processus de synchronisation
 */
export interface ISyncOrchestrator {
  /**
   * Démarre une synchronisation complète
   * @param options Options de synchronisation
   * @returns Observable du résultat de synchronisation
   */
  startSync(options: SyncOptions): Observable<SyncResult>;

  /**
   * Annule la synchronisation en cours
   */
  cancelSync(): void;

  /**
   * Obtient le statut actuel de la synchronisation
   * @returns Observable du statut de synchronisation
   */
  getSyncStatus(): Observable<SyncStatus>;
}

/**
 * Interface pour le gestionnaire de synchronisation séquentielle
 * Responsabilité: Gérer la synchronisation séquentielle des données paginées
 */
export interface ISequentialSyncManager {
  /**
   * Synchronise les membres de manière séquentielle
   * @param sessionId ID de session tontine
   * @param options Options de synchronisation
   * @returns Observable du résultat de synchronisation des membres
   */
  syncMembers(sessionId: string, options: SyncOptions): Observable<MembersSyncResult>;

  /**
   * Synchronise les collections de manière séquentielle
   * @param options Options de synchronisation
   * @returns Observable du résultat de synchronisation des collections
   */
  syncCollections(options: SyncOptions): Observable<CollectionsSyncResult>;

  /**
   * Synchronise les stocks de manière séquentielle
   * @param sessionId ID de session tontine
   * @param options Options de synchronisation
   * @returns Observable du résultat de synchronisation des stocks
   */
  syncStocks(sessionId: string, options: SyncOptions): Observable<StocksSyncResult>;
}

/**
 * Interface pour le nettoyeur de données
 * Responsabilité: Nettoyer les données existantes avant synchronisation
 */
export interface IDataCleaner {
  /**
   * Nettoie toutes les données tontine
   * @param commercialUsername Nom d'utilisateur du commercial
   * @returns Promise du résultat de nettoyage
   */
  cleanTontineData(commercialUsername: string): Promise<CleanupResult>;

  /**
   * Nettoie les membres
   * @param sessionId ID de session tontine
   * @param commercialUsername Nom d'utilisateur du commercial
   * @returns Promise de complétion
   */
  cleanMembers(sessionId: string, commercialUsername: string): Promise<void>;

  /**
   * Nettoie les collections
   * @param commercialUsername Nom d'utilisateur du commercial
   * @returns Promise de complétion
   */
  cleanCollections(commercialUsername: string): Promise<void>;

  /**
   * Nettoie les stocks
   * @param commercialUsername Nom d'utilisateur du commercial
   * @returns Promise de complétion
   */
  cleanStocks(commercialUsername: string): Promise<void>;
}

/**
 * Interface pour le validateur d'intégrité
 * Responsabilité: Vérifier l'intégrité des données synchronisées
 */
export interface IIntegrityValidator {
  /**
   * Valide le résultat de synchronisation
   * @param expected Données attendues
   * @param actual Données réelles
   * @returns Résultat de validation
   */
  validateSyncResult(expected: ExpectedData, actual: ActualData): ValidationResult;

  /**
   * Valide la structure des données
   * @param data Données à valider
   * @returns Résultat de validation de structure
   */
  validateDataStructure(data: any[]): StructureValidationResult;

  /**
   * Calcule le checksum des données
   * @param data Données pour le calcul
   * @returns Checksum calculé
   */
  calculateChecksum(data: any[]): string;
}

/**
 * Interface pour le gestionnaire d'erreur
 * Responsabilité: Gérer les erreurs et déclencher les rollbacks si nécessaire
 */
export interface IErrorHandler {
  /**
   * Gère une erreur de synchronisation
   * @param error Erreur à gérer
   * @param context Contexte de l'erreur
   * @returns Résultat de gestion d'erreur
   */
  handleSyncError(error: SyncError, context: SyncContext): ErrorHandlingResult;

  /**
   * Détermine si l'opération doit être retentée
   * @param error Erreur à évaluer
   * @returns true si retry recommandé
   */
  shouldRetry(error: SyncError): boolean;

  /**
   * Détermine si un rollback doit être effectué
   * @param error Erreur à évaluer
   * @returns true si rollback nécessaire
   */
  shouldRollback(error: SyncError): boolean;
}

/**
 * Interface pour le gestionnaire de rollback
 * Responsabilité: Gérer les points de restauration et rollbacks
 */
export interface IRollbackManager {
  /**
   * Crée un point de restauration
   * @returns Promise du point de restauration créé
   */
  createRestorePoint(): Promise<RestorePoint>;

  /**
   * Effectue un rollback vers un point de restauration
   * @param restorePoint Point de restauration cible
   * @returns Promise de complétion
   */
  rollbackToRestorePoint(restorePoint: RestorePoint): Promise<void>;

  /**
   * Nettoie les anciens points de restauration
   * @returns Promise de complétion
   */
  cleanupRestorePoints(): Promise<void>;
}
