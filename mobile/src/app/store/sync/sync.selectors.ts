import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SyncState, syncFeatureKey } from './sync.reducer';

// Sélecteur de base
export const selectSyncState = createFeatureSelector<SyncState>(syncFeatureKey);

// ==================== SÉLECTEURS SYNCHRONISATION AUTOMATIQUE ====================

export const selectAutomaticSyncState = createSelector(
  selectSyncState,
  (state) => state.automaticSync
);

export const selectAutomaticSyncIsActive = createSelector(
  selectAutomaticSyncState,
  (automaticSync) => automaticSync.isActive
);

export const selectAutomaticSyncProgress = createSelector(
  selectAutomaticSyncState,
  (automaticSync) => automaticSync.progress
);

export const selectAutomaticSyncResult = createSelector(
  selectAutomaticSyncState,
  (automaticSync) => automaticSync.result
);

export const selectAutomaticSyncStatus = createSelector(
  selectAutomaticSyncState,
  (automaticSync) => automaticSync.status
);

export const selectAutomaticSyncError = createSelector(
  selectAutomaticSyncState,
  (automaticSync) => automaticSync.error
);

export const selectCanCancelAutomaticSync = createSelector(
  selectAutomaticSyncProgress,
  (progress) => progress?.canCancel || false
);

// ==================== SÉLECTEURS SYNCHRONISATION MANUELLE ====================

export const selectManualSyncState = createSelector(
  selectSyncState,
  (state) => state.manualSync
);

export const selectManualSyncActiveTab = createSelector(
  selectManualSyncState,
  (manualSync) => manualSync.activeTab
);

export const selectManualSyncIsLoading = createSelector(
  selectManualSyncState,
  (manualSync) => manualSync.isLoading
);

export const selectAvailableClients = createSelector(
  selectManualSyncState,
  (manualSync) => manualSync.availableClients
);

export const selectAvailableDistributions = createSelector(
  selectManualSyncState,
  (manualSync) => manualSync.availableDistributions
);

export const selectAvailableRecoveries = createSelector(
  selectManualSyncState,
  (manualSync) => manualSync.availableRecoveries
);

export const selectClientSelection = createSelector(
  selectManualSyncState,
  (manualSync) => manualSync.clients
);

export const selectDistributionSelection = createSelector(
  selectManualSyncState,
  (manualSync) => manualSync.distributions
);

export const selectRecoverySelection = createSelector(
  selectManualSyncState,
  (manualSync) => manualSync.recoveries
);

export const selectSyncingEntities = createSelector(
  selectManualSyncState,
  (manualSync) => manualSync.syncingEntities
);

export const selectHasSelectedEntities = createSelector(
  selectManualSyncState,
  (manualSync) => {
    return manualSync.clients.selectedIds.length > 0 ||
           manualSync.distributions.selectedIds.length > 0 ||
           manualSync.recoveries.selectedIds.length > 0;
  }
);

export const selectSelectedEntitiesCount = createSelector(
  selectManualSyncState,
  (manualSync) => {
    return manualSync.clients.selectedIds.length +
           manualSync.distributions.selectedIds.length +
           manualSync.recoveries.selectedIds.length;
  }
);

export const selectCurrentTabData = createSelector(
  selectManualSyncState,
  (manualSync) => {
    switch (manualSync.activeTab) {
      case 'clients':
        return {
          entities: manualSync.availableClients,
          selection: manualSync.clients,
          type: 'client' as const
        };
      case 'distributions':
        return {
          entities: manualSync.availableDistributions,
          selection: manualSync.distributions,
          type: 'distribution' as const
        };
      case 'recoveries':
        return {
          entities: manualSync.availableRecoveries,
          selection: manualSync.recoveries,
          type: 'recovery' as const
        };
      default:
        return {
          entities: [],
          selection: manualSync.clients,
          type: 'client' as const
        };
    }
  }
);

// ==================== SÉLECTEURS GESTION DES ERREURS ====================

export const selectSyncErrorsState = createSelector(
  selectSyncState,
  (state) => state.errors
);

export const selectSyncErrors = createSelector(
  selectSyncErrorsState,
  (errors) => errors.list
);

export const selectSyncErrorsLoading = createSelector(
  selectSyncErrorsState,
  (errors) => errors.loading
);

export const selectRetryingErrorIds = createSelector(
  selectSyncErrorsState,
  (errors) => errors.retryingIds
);

export const selectSyncErrorsStatistics = createSelector(
  selectSyncErrorsState,
  (errors) => errors.statistics
);

export const selectSyncErrorsCount = createSelector(
  selectSyncErrors,
  (errors) => errors.length
);

export const selectSyncErrorsByType = createSelector(
  selectSyncErrors,
  (errors) => {
    return errors.reduce((acc, error) => {
      if (!acc[error.entityType]) {
        acc[error.entityType] = [];
      }
      acc[error.entityType].push(error);
      return acc;
    }, {} as { [key: string]: typeof errors });
  }
);

export const selectRetryableErrors = createSelector(
  selectSyncErrors,
  (errors) => errors.filter(error => error.canRetry)
);

export const selectRetryableErrorsCount = createSelector(
  selectRetryableErrors,
  (errors) => errors.length
);

// ==================== SÉLECTEURS CAISSE ====================

export const selectCashDeskState = createSelector(
  selectSyncState,
  (state) => state.cashDesk
);

export const selectCashDeskIsOpened = createSelector(
  selectCashDeskState,
  (cashDesk) => cashDesk.isOpened
);

export const selectCashDeskChecking = createSelector(
  selectCashDeskState,
  (cashDesk) => cashDesk.checking
);

export const selectCashDeskOpening = createSelector(
  selectCashDeskState,
  (cashDesk) => cashDesk.opening
);

export const selectCashDeskError = createSelector(
  selectCashDeskState,
  (cashDesk) => cashDesk.error
);

export const selectCashDeskReady = createSelector(
  selectCashDeskState,
  (cashDesk) => cashDesk.isOpened === true && !cashDesk.checking && !cashDesk.opening
);

// ==================== SÉLECTEURS GÉNÉRAUX ====================

export const selectSyncLoading = createSelector(
  selectSyncState,
  (state) => state.loading
);

export const selectSyncError = createSelector(
  selectSyncState,
  (state) => state.error
);

export const selectAnySyncActive = createSelector(
  selectAutomaticSyncIsActive,
  selectManualSyncIsLoading,
  (automaticActive, manualLoading) => automaticActive || manualLoading
);

export const selectSyncSummary = createSelector(
  selectAutomaticSyncResult,
  selectSyncErrorsCount,
  selectRetryableErrorsCount,
  (result, totalErrors, retryableErrors) => ({
    lastSyncResult: result,
    totalErrors,
    retryableErrors,
    hasErrors: totalErrors > 0
  })
);

// ==================== SÉLECTEURS POUR L'UI ====================

export const selectSyncProgressPercentage = createSelector(
  selectAutomaticSyncProgress,
  (progress) => progress?.percentage || 0
);

export const selectSyncCurrentStep = createSelector(
  selectAutomaticSyncProgress,
  (progress) => progress?.currentStep || ''
);

export const selectSyncCurrentPhase = createSelector(
  selectAutomaticSyncProgress,
  (progress) => progress?.currentPhase || 'cash-check'
);

export const selectSyncSteps = createSelector(
  selectAutomaticSyncProgress,
  (progress) => {
    if (!progress) return [];
    
    const steps = [
      {
        id: 'cash-check',
        name: 'Vérification caisse',
        status: progress.currentPhase === 'cash-check' ? 'active' : 
                ['clients', 'distributions', 'recoveries', 'updates', 'completed'].includes(progress.currentPhase) ? 'completed' : 'pending'
      },
      {
        id: 'clients',
        name: 'Synchronisation clients',
        status: progress.currentPhase === 'clients' ? 'active' : 
                ['distributions', 'recoveries', 'updates', 'completed'].includes(progress.currentPhase) ? 'completed' : 'pending'
      },
      {
        id: 'distributions',
        name: 'Synchronisation distributions',
        status: progress.currentPhase === 'distributions' ? 'active' : 
                ['recoveries', 'updates', 'completed'].includes(progress.currentPhase) ? 'completed' : 'pending'
      },
      {
        id: 'recoveries',
        name: 'Synchronisation recouvrements',
        status: progress.currentPhase === 'recoveries' ? 'active' : 
                ['updates', 'completed'].includes(progress.currentPhase) ? 'completed' : 'pending'
      },
      {
        id: 'updates',
        name: 'Mise à jour données',
        status: progress.currentPhase === 'updates' ? 'active' : 
                progress.currentPhase === 'completed' ? 'completed' : 'pending'
      }
    ];

    return steps;
  }
);

export const selectCanStartSync = createSelector(
  selectCashDeskReady,
  selectAnySyncActive,
  (cashDeskReady, syncActive) => cashDeskReady && !syncActive
);