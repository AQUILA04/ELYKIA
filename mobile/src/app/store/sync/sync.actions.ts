import { createAction, props } from '@ngrx/store';
import { SyncProgress, SyncResult, SyncError, SyncSelection } from '../../models/sync.model';

// ==================== ACTIONS SYNCHRONISATION AUTOMATIQUE ====================

export const startAutomaticSync = createAction(
  '[Sync] Start Automatic Sync'
);

export const automaticSyncProgress = createAction(
  '[Sync] Automatic Sync Progress',
  props<{ progress: SyncProgress }>()
);

export const automaticSyncSuccess = createAction(
  '[Sync] Automatic Sync Success',
  props<{ result: SyncResult }>()
);

export const automaticSyncFailure = createAction(
  '[Sync] Automatic Sync Failure',
  props<{ error: any }>()
);

export const cancelAutomaticSync = createAction(
  '[Sync] Cancel Automatic Sync'
);

// ==================== ACTIONS SYNCHRONISATION MANUELLE ====================

export const loadManualSyncData = createAction(
  '[Sync] Load Manual Sync Data'
);

export const loadManualSyncDataSuccess = createAction(
  '[Sync] Load Manual Sync Data Success',
  props<{
    clients: any[],
    distributions: any[],
    recoveries: any[],
    tontineMembers?: any[],
    tontineCollections?: any[],
    tontineDeliveries?: any[]
  }>()
);

export const loadManualSyncDataFailure = createAction(
  '[Sync] Load Manual Sync Data Failure',
  props<{ error: any }>()
);

// ==================== ACTIONS PAGINATION (MANUAL SYNC) ====================

export const loadManualSyncDataPaginated = createAction(
  '[Sync] Load Manual Sync Data Paginated',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery',
    page: number,
    size: number,
    filters?: any
  }>()
);

export const loadManualSyncDataPaginatedSuccess = createAction(
  '[Sync] Load Manual Sync Data Paginated Success',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery',
    data: any[],
    pageInfo: {
      page: number,
      size: number,
      totalPages: number,
      totalElements: number
    }
  }>()
);

export const loadManualSyncDataPaginatedFailure = createAction(
  '[Sync] Load Manual Sync Data Paginated Failure',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery',
    error: any
  }>()
);

export const loadMoreManualSyncData = createAction(
  '[Sync] Load More Manual Sync Data',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery'
  }>()
);

// ==================== ACTIONS SÉLECTION PARENT (MODALE) ====================

export const loadSyncedParentsPaginated = createAction(
  '[Sync] Load Synced Parents Paginated',
  props<{
    entityType: 'client' | 'distribution' | 'tontine-member',
    page: number,
    size: number,
    filters?: any
  }>()
);

export const loadSyncedParentsPaginatedSuccess = createAction(
  '[Sync] Load Synced Parents Paginated Success',
  props<{
    entityType: 'client' | 'distribution' | 'tontine-member',
    data: any[],
    pageInfo: {
      page: number,
      size: number,
      totalPages: number,
      totalElements: number
    }
  }>()
);

export const loadSyncedParentsPaginatedFailure = createAction(
  '[Sync] Load Synced Parents Paginated Failure',
  props<{
    entityType: 'client' | 'distribution' | 'tontine-member',
    error: any
  }>()
);

export const searchSyncedParents = createAction(
  '[Sync] Search Synced Parents',
  props<{
    entityType: 'client' | 'distribution' | 'tontine-member',
    query: string
  }>()
);

export const loadMoreSyncedParents = createAction(
  '[Sync] Load More Synced Parents',
  props<{
    entityType: 'client' | 'distribution' | 'tontine-member'
  }>()
);

export const clearParentSelectionState = createAction(
  '[Sync] Clear Parent Selection State'
);

// ==================== ACTIONS UI & SELECTION ====================

export const setActiveTab = createAction(
  '[Sync] Set Active Tab',
  props<{ tab: 'clients' | 'distributions' | 'recoveries' | 'tontine-members' | 'tontine-collections' | 'tontine-deliveries' | 'all' }>()
);

export const toggleEntitySelection = createAction(
  '[Sync] Toggle Entity Selection',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery',
    entityId: string
  }>()
);

export const selectAllEntities = createAction(
  '[Sync] Select All Entities',
  props<{ entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery' }>()
);

export const clearEntitySelection = createAction(
  '[Sync] Clear Entity Selection',
  props<{ entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery' }>()
);

export const startManualSync = createAction(
  '[Sync] Start Manual Sync',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery' | 'clients' | 'distributions' | 'recoveries' | 'tontine-members' | 'tontine-collections' | 'tontine-deliveries',
    selectedIds: string[]
  }>()
);

export const manualSyncProgress = createAction(
  '[Sync] Manual Sync Progress',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery',
    processed: number,
    total: number,
    currentItem: string
  }>()
);

export const manualSyncSuccess = createAction(
  '[Sync] Manual Sync Success',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery' | 'clients' | 'distributions' | 'recoveries' | 'tontine-members' | 'tontine-collections' | 'tontine-deliveries',
    successCount: number,
    errorCount: number
  }>()
);

export const manualSyncFailure = createAction(
  '[Sync] Manual Sync Failure',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery' | 'clients' | 'distributions' | 'recoveries' | 'tontine-members' | 'tontine-collections' | 'tontine-deliveries',
    error: any
  }>()
);

export const syncSingleEntity = createAction(
  '[Sync] Sync Single Entity',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery',
    entityId: string
  }>()
);

export const syncSingleEntitySuccess = createAction(
  '[Sync] Sync Single Entity Success',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery',
    entityId: string
  }>()
);

export const syncSingleEntityFailure = createAction(
  '[Sync] Sync Single Entity Failure',
  props<{
    entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery',
    entityId: string,
    error: any
  }>()
);

// ==================== ACTIONS GESTION DES ERREURS ====================

export const loadSyncErrors = createAction(
  '[Sync] Load Sync Errors'
);

export const loadSyncErrorsSuccess = createAction(
  '[Sync] Load Sync Errors Success',
  props<{ errors: SyncError[] }>()
);

export const loadSyncErrorsFailure = createAction(
  '[Sync] Load Sync Errors Failure',
  props<{ error: any }>()
);

export const retrySyncError = createAction(
  '[Sync] Retry Sync Error',
  props<{ errorId: string }>()
);

export const retrySyncErrorSuccess = createAction(
  '[Sync] Retry Sync Error Success',
  props<{ errorId: string }>()
);

export const retrySyncErrorFailure = createAction(
  '[Sync] Retry Sync Error Failure',
  props<{ errorId: string, error: any }>()
);

export const retrySelectedErrors = createAction(
  '[Sync] Retry Selected Errors',
  props<{ errorIds: string[] }>()
);

export const retrySelectedErrorsSuccess = createAction(
  '[Sync] Retry Selected Errors Success',
  props<{ successCount: number, failedCount: number }>()
);

export const retrySelectedErrorsFailure = createAction(
  '[Sync] Retry Selected Errors Failure',
  props<{ error: any }>()
);

export const clearResolvedErrors = createAction(
  '[Sync] Clear Resolved Errors'
);

export const clearResolvedErrorsSuccess = createAction(
  '[Sync] Clear Resolved Errors Success'
);

export const clearResolvedErrorsFailure = createAction(
  '[Sync] Clear Resolved Errors Failure',
  props<{ error: any }>()
);

// ==================== ACTIONS VÉRIFICATION CAISSE ====================

export const checkCashDeskStatus = createAction(
  '[Sync] Check Cash Desk Status'
);

export const checkCashDeskStatusSuccess = createAction(
  '[Sync] Check Cash Desk Status Success',
  props<{ isOpened: boolean }>()
);

export const checkCashDeskStatusFailure = createAction(
  '[Sync] Check Cash Desk Status Failure',
  props<{ error: any }>()
);

export const openCashDesk = createAction(
  '[Sync] Open Cash Desk'
);

export const openCashDeskSuccess = createAction(
  '[Sync] Open Cash Desk Success',
  props<{ cashDeskData: any }>()
);

export const openCashDeskFailure = createAction(
  '[Sync] Open Cash Desk Failure',
  props<{ error: any }>()
);

// ==================== ACTIONS GÉNÉRALES ====================

export const resetSyncState = createAction(
  '[Sync] Reset Sync State'
);

export const updateSyncProgress = createAction(
  '[Sync] Update Sync Progress',
  props<{ progress: Partial<SyncProgress> }>()
);

export const setSyncLoading = createAction(
  '[Sync] Set Sync Loading',
  props<{ loading: boolean }>()
);

export const setSyncError = createAction(
  '[Sync] Set Sync Error',
  props<{ error: any }>()
);

export const clearSyncError = createAction(
  '[Sync] Clear Sync Error'
);
