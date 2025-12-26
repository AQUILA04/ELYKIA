import { createReducer, on } from '@ngrx/store';
import { SyncProgress, SyncResult, SyncError, ManualSyncState, SyncStatus, SyncSelection } from '../../models/sync.model';
import * as SyncActions from './sync.actions';

export interface SyncState {
  // État de la synchronisation automatique
  automaticSync: {
    isActive: boolean;
    progress: SyncProgress | null;
    result: SyncResult | null;
    status: SyncStatus;
    error: any;
  };

  // État de la synchronisation manuelle
  manualSync: ManualSyncState & {
    availableClients: any[];
    availableDistributions: any[];
    availableRecoveries: any[];
    syncingEntities: string[];
  };

  // Gestion des erreurs
  errors: {
    list: SyncError[];
    loading: boolean;
    retryingIds: string[];
    statistics: { [key: string]: number };
  };

  // État de la caisse
  cashDesk: {
    isOpened: boolean | null;
    checking: boolean;
    opening: boolean;
    error: any;
  };

  // État général
  loading: boolean;
  error: any;
}

const initialProgress: SyncProgress = {
  currentPhase: 'cash-check',
  currentStep: 'Vérification de la caisse',
  totalItems: 0,
  processedItems: 0,
  percentage: 0,
  errors: [],
  isActive: false,
  canCancel: true
};

const initialManualSyncState: ManualSyncState = {
  clients: {
    entityType: 'client',
    selectedIds: [],
    totalCount: 0,
    isSelectAll: false
  },
  distributions: {
    entityType: 'distribution',
    selectedIds: [],
    totalCount: 0,
    isSelectAll: false
  },
  recoveries: {
    entityType: 'recovery',
    selectedIds: [],
    totalCount: 0,
    isSelectAll: false
  },
  isLoading: false,
  activeTab: 'clients'
};

const initialState: SyncState = {
  automaticSync: {
    isActive: false,
    progress: null,
    result: null,
    status: SyncStatus.IDLE,
    error: null
  },
  manualSync: {
    ...initialManualSyncState,
    availableClients: [],
    availableDistributions: [],
    availableRecoveries: [],
    syncingEntities: []
  },
  errors: {
    list: [],
    loading: false,
    retryingIds: [],
    statistics: {}
  },
  cashDesk: {
    isOpened: null,
    checking: false,
    opening: false,
    error: null
  },
  loading: false,
  error: null
};

export const syncReducer = createReducer(
  initialState,

  // ==================== SYNCHRONISATION AUTOMATIQUE ====================

  on(SyncActions.startAutomaticSync, (state) => ({
    ...state,
    automaticSync: {
      ...state.automaticSync,
      isActive: true,
      status: SyncStatus.RUNNING,
      progress: { ...initialProgress, isActive: true },
      result: null,
      error: null
    },
    loading: true,
    error: null
  })),

  on(SyncActions.automaticSyncProgress, (state, { progress }) => ({
    ...state,
    automaticSync: {
      ...state.automaticSync,
      progress: { ...progress, isActive: true }
    }
  })),

  on(SyncActions.automaticSyncSuccess, (state, { result }) => ({
    ...state,
    automaticSync: {
      ...state.automaticSync,
      isActive: false,
      status: SyncStatus.COMPLETED,
      result,
      progress: state.automaticSync.progress ? {
        ...state.automaticSync.progress,
        isActive: false,
        percentage: 100,
        currentStep: 'Synchronisation terminée'
      } : null
    },
    loading: false
  })),

  on(SyncActions.automaticSyncFailure, (state, { error }) => ({
    ...state,
    automaticSync: {
      ...state.automaticSync,
      isActive: false,
      status: SyncStatus.ERROR,
      error
    },
    loading: false,
    error
  })),

  on(SyncActions.cancelAutomaticSync, (state) => ({
    ...state,
    automaticSync: {
      ...state.automaticSync,
      isActive: false,
      status: SyncStatus.CANCELLED,
      progress: state.automaticSync.progress ? {
        ...state.automaticSync.progress,
        isActive: false,
        canCancel: false,
        currentStep: 'Synchronisation annulée'
      } : null
    },
    loading: false
  })),

  // ==================== SYNCHRONISATION MANUELLE ====================

  on(SyncActions.loadManualSyncData, (state) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      isLoading: true
    }
  })),

  on(SyncActions.loadManualSyncDataSuccess, (state, { clients, distributions, recoveries }) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      isLoading: false,
      availableClients: clients,
      availableDistributions: distributions,
      availableRecoveries: recoveries,
      clients: {
        ...state.manualSync.clients,
        totalCount: clients.length,
        selectedIds: []
      },
      distributions: {
        ...state.manualSync.distributions,
        totalCount: distributions.length,
        selectedIds: []
      },
      recoveries: {
        ...state.manualSync.recoveries,
        totalCount: recoveries.length,
        selectedIds: []
      }
    }
  })),

  on(SyncActions.loadManualSyncDataFailure, (state, { error }) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      isLoading: false
    },
    error
  })),

  on(SyncActions.setActiveTab, (state, { tab }) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      activeTab: tab
    }
  })),

  on(SyncActions.toggleEntitySelection, (state, { entityType, entityId }) => {
    // Convertir entityType au pluriel pour accéder aux propriétés de ManualSyncState
    const entityTypeKey = `${entityType}s` as keyof ManualSyncState;
    const selection = state.manualSync[entityTypeKey] as SyncSelection;
    let newSelectedIds = [...selection.selectedIds];

    const index = newSelectedIds.indexOf(entityId);
    if (index > -1) {
      newSelectedIds.splice(index, 1);
    } else {
      newSelectedIds.push(entityId);
    }

    const updatedSelection: SyncSelection = {
      ...selection,
      selectedIds: newSelectedIds,
      isSelectAll: newSelectedIds.length === selection.totalCount
    };

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        [entityTypeKey]: updatedSelection
      }
    };
  }),

  on(SyncActions.selectAllEntities, (state, { entityType }) => {
    const availableEntities = state.manualSync[`available${entityType.charAt(0).toUpperCase() + entityType.slice(1)}s` as keyof typeof state.manualSync] as any[];
    const allIds = availableEntities.map(entity => entity.id);

    // Convertir entityType au pluriel pour accéder aux propriétés de ManualSyncState
    const entityTypeKey = `${entityType}s` as keyof ManualSyncState;
    const currentSelection = state.manualSync[entityTypeKey] as SyncSelection;

    const updatedSelection: SyncSelection = {
      ...currentSelection,
      selectedIds: allIds,
      isSelectAll: true
    };

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        [entityTypeKey]: updatedSelection
      }
    };
  }),

  on(SyncActions.clearEntitySelection, (state, { entityType }) => {
    // Convertir entityType au pluriel pour accéder aux propriétés de ManualSyncState
    const entityTypeKey = `${entityType}s` as keyof ManualSyncState;
    const currentSelection = state.manualSync[entityTypeKey] as SyncSelection;

    const updatedSelection: SyncSelection = {
      ...currentSelection,
      selectedIds: [],
      isSelectAll: false
    };

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        [entityTypeKey]: updatedSelection
      }
    };
  }),

  on(SyncActions.startManualSync, (state, { entityType }) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      isLoading: true
    }
  })),

  on(SyncActions.manualSyncSuccess, (state, { entityType, successCount }) => {
    // Retirer les éléments synchronisés avec succès de la liste
    const availableKey = `available${entityType.charAt(0).toUpperCase() + entityType.slice(1)}s` as keyof typeof state.manualSync;
    const currentAvailable = state.manualSync[availableKey] as any[];

    // Convertir entityType au pluriel pour accéder aux propriétés de ManualSyncState
    const entityTypeKey = `${entityType}s` as keyof ManualSyncState;
    const currentSelection = state.manualSync[entityTypeKey] as SyncSelection;
    const selectedIds = currentSelection.selectedIds;

    const updatedAvailable = currentAvailable.filter(entity => !selectedIds.includes(entity.id));

    // Mettre à jour la sélection
    const updatedSelection: SyncSelection = {
      ...currentSelection,
      selectedIds: [],
      totalCount: updatedAvailable.length,
      isSelectAll: false
    };

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        isLoading: false,
        [availableKey]: updatedAvailable,
        [entityTypeKey]: updatedSelection
      }
    };
  }),

  on(SyncActions.manualSyncFailure, (state, { error }) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      isLoading: false
    },
    error
  })),

  on(SyncActions.syncSingleEntity, (state, { entityId }) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      syncingEntities: [...state.manualSync.syncingEntities, entityId]
    }
  })),

  on(SyncActions.syncSingleEntitySuccess, (state, { entityType, entityId }) => {
    // Retirer l'entité de la liste disponible et des entités en cours de sync
    const availableKey = `available${entityType.charAt(0).toUpperCase() + entityType.slice(1)}s` as keyof typeof state.manualSync;
    const currentAvailable = state.manualSync[availableKey] as any[];
    const updatedAvailable = currentAvailable.filter(entity => entity.id !== entityId);

    // Convertir entityType au pluriel pour accéder aux propriétés de ManualSyncState
    const entityTypeKey = `${entityType}s` as keyof ManualSyncState;

    const newSyncingEntities = state.manualSync.syncingEntities.filter(id => id !== entityId);

    // Mettre à jour la sélection correspondante
    const currentSelection = state.manualSync[entityTypeKey] as SyncSelection;
    const updatedSelection: SyncSelection = {
      ...currentSelection,
      totalCount: updatedAvailable.length
    };

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        [availableKey]: updatedAvailable,
        syncingEntities: newSyncingEntities,
        [entityTypeKey]: updatedSelection
      }
    };
  }),

  on(SyncActions.syncSingleEntityFailure, (state, { entityId }) => {
    const newSyncingEntities = state.manualSync.syncingEntities.filter(id => id !== entityId);

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        syncingEntities: newSyncingEntities
      }
    };
  }),

  // ==================== GESTION DES ERREURS ====================

  on(SyncActions.loadSyncErrors, (state) => ({
    ...state,
    errors: {
      ...state.errors,
      loading: true
    }
  })),

  on(SyncActions.loadSyncErrorsSuccess, (state, { errors }) => ({
    ...state,
    errors: {
      ...state.errors,
      loading: false,
      list: errors
    }
  })),

  on(SyncActions.loadSyncErrorsFailure, (state, { error }) => ({
    ...state,
    errors: {
      ...state.errors,
      loading: false
    },
    error
  })),

  on(SyncActions.retrySyncError, (state, { errorId }) => ({
    ...state,
    errors: {
      ...state.errors,
      retryingIds: [...state.errors.retryingIds, errorId]
    }
  })),

  on(SyncActions.retrySyncErrorSuccess, (state, { errorId }) => {
    const newRetryingIds = state.errors.retryingIds.filter(id => id !== errorId);
    const updatedErrors = state.errors.list.filter(error => error.id !== errorId);

    return {
      ...state,
      errors: {
        ...state.errors,
        retryingIds: newRetryingIds,
        list: updatedErrors
      }
    };
  }),

  on(SyncActions.retrySyncErrorFailure, (state, { errorId }) => {
    const newRetryingIds = state.errors.retryingIds.filter(id => id !== errorId);

    return {
      ...state,
      errors: {
        ...state.errors,
        retryingIds: newRetryingIds
      }
    };
  }),

  // ==================== VÉRIFICATION CAISSE ====================

  on(SyncActions.checkCashDeskStatus, (state) => ({
    ...state,
    cashDesk: {
      ...state.cashDesk,
      checking: true,
      error: null
    }
  })),

  on(SyncActions.checkCashDeskStatusSuccess, (state, { isOpened }) => ({
    ...state,
    cashDesk: {
      ...state.cashDesk,
      checking: false,
      isOpened
    }
  })),

  on(SyncActions.checkCashDeskStatusFailure, (state, { error }) => ({
    ...state,
    cashDesk: {
      ...state.cashDesk,
      checking: false,
      error
    }
  })),

  on(SyncActions.openCashDesk, (state) => ({
    ...state,
    cashDesk: {
      ...state.cashDesk,
      opening: true,
      error: null
    }
  })),

  on(SyncActions.openCashDeskSuccess, (state, { cashDeskData }) => ({
    ...state,
    cashDesk: {
      ...state.cashDesk,
      opening: false,
      isOpened: true
    }
  })),

  on(SyncActions.openCashDeskFailure, (state, { error }) => ({
    ...state,
    cashDesk: {
      ...state.cashDesk,
      opening: false,
      error
    }
  })),

  // ==================== ACTIONS GÉNÉRALES ====================

  on(SyncActions.resetSyncState, () => initialState),

  on(SyncActions.updateSyncProgress, (state, { progress }) => ({
    ...state,
    automaticSync: {
      ...state.automaticSync,
      progress: state.automaticSync.progress ? {
        ...state.automaticSync.progress,
        ...progress
      } : null
    }
  })),

  on(SyncActions.setSyncLoading, (state, { loading }) => ({
    ...state,
    loading
  })),

  on(SyncActions.setSyncError, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  on(SyncActions.clearSyncError, (state) => ({
    ...state,
    error: null
  }))
);

export const syncFeatureKey = 'sync';
