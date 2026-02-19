import { createReducer, on } from '@ngrx/store';
import { SyncProgress, SyncResult, SyncError, ManualSyncState, SyncStatus, SyncSelection, PaginationState } from '../../models/sync.model';
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
    availableTontineMembers: any[];
    availableTontineCollections: any[];
    availableTontineDeliveries: any[];
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

const initialPaginationState: PaginationState = {
  page: 0,
  size: 20,
  totalPages: 0,
  totalElements: 0,
  loading: false,
  hasMore: true
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
  tontineMembers: {
    entityType: 'tontine-member',
    selectedIds: [],
    totalCount: 0,
    isSelectAll: false
  },
  tontineCollections: {
    entityType: 'tontine-collection',
    selectedIds: [],
    totalCount: 0,
    isSelectAll: false
  },
  tontineDeliveries: {
    entityType: 'tontine-delivery',
    selectedIds: [],
    totalCount: 0,
    isSelectAll: false
  },
  isLoading: false,
  activeTab: 'clients',
  pagination: {
    clients: { ...initialPaginationState },
    distributions: { ...initialPaginationState },
    recoveries: { ...initialPaginationState },
    tontineMembers: { ...initialPaginationState },
    tontineCollections: { ...initialPaginationState },
    tontineDeliveries: { ...initialPaginationState }
  }
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
    availableTontineMembers: [],
    availableTontineCollections: [],
    availableTontineDeliveries: [],
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

// Helper function to map entity types to ManualSyncState keys
function getEntityStateKeys(entityType: string): {
  listKey: keyof SyncState['manualSync'],
  selectionKey: keyof SyncState['manualSync']
} {
  switch (entityType) {
    case 'client':
      return { listKey: 'availableClients', selectionKey: 'clients' };
    case 'distribution':
      return { listKey: 'availableDistributions', selectionKey: 'distributions' };
    case 'recovery':
      return { listKey: 'availableRecoveries', selectionKey: 'recoveries' };
    case 'tontine-member':
      return { listKey: 'availableTontineMembers', selectionKey: 'tontineMembers' };
    case 'tontine-collection':
      return { listKey: 'availableTontineCollections', selectionKey: 'tontineCollections' };
    case 'tontine-delivery':
      return { listKey: 'availableTontineDeliveries', selectionKey: 'tontineDeliveries' };
    default:
      console.warn(`Unknown entity type: ${entityType}`);
      return {
        listKey: `available${entityType}s` as any,
        selectionKey: `${entityType}s` as any
      };
  }
}

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

  on(SyncActions.loadManualSyncDataSuccess, (state, { clients, distributions, recoveries, tontineMembers, tontineCollections, tontineDeliveries }) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      isLoading: false,
      availableClients: clients,
      availableDistributions: distributions,
      availableRecoveries: recoveries,
      availableTontineMembers: tontineMembers || [],
      availableTontineCollections: tontineCollections || [],
      availableTontineDeliveries: tontineDeliveries || [],
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
      },
      tontineMembers: {
        ...state.manualSync.tontineMembers,
        totalCount: (tontineMembers || []).length,
        selectedIds: []
      },
      tontineCollections: {
        ...state.manualSync.tontineCollections,
        totalCount: (tontineCollections || []).length,
        selectedIds: []
      },
      tontineDeliveries: {
        ...state.manualSync.tontineDeliveries,
        totalCount: (tontineDeliveries || []).length,
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

  // ==================== PAGINATION ====================

  on(SyncActions.loadManualSyncDataPaginated, (state, { entityType }) => {
    const { selectionKey } = getEntityStateKeys(entityType);
    // Cast to ensure TS knows it's a key of pagination
    const paginationKey = selectionKey as keyof typeof state.manualSync.pagination;

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        pagination: {
          ...state.manualSync.pagination,
          [paginationKey]: {
            ...state.manualSync.pagination[paginationKey],
            loading: true
          }
        }
      }
    };
  }),

  on(SyncActions.loadManualSyncDataPaginatedSuccess, (state, { entityType, data, pageInfo }) => {
    const { listKey, selectionKey } = getEntityStateKeys(entityType);
    const paginationKey = selectionKey as keyof typeof state.manualSync.pagination;

    // Append data if page > 0, replace if page === 0
    const currentList = pageInfo.page === 0 ? [] : (state.manualSync[listKey] as any[]);
    const newList = [...currentList, ...data];

    // Cast selection to SyncSelection to avoid spread error
    const currentSelection = state.manualSync[selectionKey] as SyncSelection;

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        [listKey]: newList,
        pagination: {
          ...state.manualSync.pagination,
          [paginationKey]: {
            ...state.manualSync.pagination[paginationKey],
            loading: false,
            page: pageInfo.page,
            size: pageInfo.size,
            totalPages: pageInfo.totalPages,
            totalElements: pageInfo.totalElements,
            hasMore: pageInfo.page < pageInfo.totalPages - 1
          }
        },
        // Update selection total count
        [selectionKey]: {
          ...currentSelection,
          totalCount: pageInfo.totalElements
        }
      }
    };
  }),

  on(SyncActions.loadManualSyncDataPaginatedFailure, (state, { entityType, error }) => {
    const { selectionKey } = getEntityStateKeys(entityType);
    const paginationKey = selectionKey as keyof typeof state.manualSync.pagination;

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        pagination: {
          ...state.manualSync.pagination,
          [paginationKey]: {
            ...state.manualSync.pagination[paginationKey],
            loading: false
          }
        }
      },
      error
    };
  }),

  on(SyncActions.setActiveTab, (state, { tab }) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      activeTab: tab
    }
  })),

  on(SyncActions.toggleEntitySelection, (state, { entityType, entityId }) => {
    const { selectionKey } = getEntityStateKeys(entityType);
    const selection = state.manualSync[selectionKey] as SyncSelection;

    // Safety check
    if (!selection) return state;

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
        [selectionKey]: updatedSelection
      }
    };
  }),

  on(SyncActions.selectAllEntities, (state, { entityType }) => {
    const { listKey, selectionKey } = getEntityStateKeys(entityType);

    // Safety check
    const availableEntities = (state.manualSync[listKey] as any) as any[];
    if (!availableEntities) return state;

    const allIds = availableEntities.map(entity => entity.id);
    const currentSelection = state.manualSync[selectionKey] as SyncSelection;

    const updatedSelection: SyncSelection = {
      ...currentSelection,
      selectedIds: allIds,
      isSelectAll: true
    };

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        [selectionKey]: updatedSelection
      }
    };
  }),

  on(SyncActions.clearEntitySelection, (state, { entityType }) => {
    const { selectionKey } = getEntityStateKeys(entityType);
    const currentSelection = state.manualSync[selectionKey] as SyncSelection;

    // Safety check
    if (!currentSelection) return state;

    const updatedSelection: SyncSelection = {
      ...currentSelection,
      selectedIds: [],
      isSelectAll: false
    };

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        [selectionKey]: updatedSelection
      }
    };
  }),

  on(SyncActions.startManualSync, (state) => ({
    ...state,
    manualSync: {
      ...state.manualSync,
      isLoading: true
    }
  })),

  on(SyncActions.manualSyncSuccess, (state, { entityType }) => {
    const { listKey, selectionKey } = getEntityStateKeys(entityType);

    const currentAvailable = (state.manualSync[listKey] as any) as any[];
    const currentSelection = state.manualSync[selectionKey] as SyncSelection;

    if (!currentAvailable || !currentSelection) return state;

    const selectedIds = currentSelection.selectedIds;
    const updatedAvailable = currentAvailable.filter(entity => !selectedIds.includes(entity.id));

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
        [listKey]: updatedAvailable,
        [selectionKey]: updatedSelection
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
    const { listKey, selectionKey } = getEntityStateKeys(entityType);

    const currentAvailable = (state.manualSync[listKey] as any) as any[];
    const newSyncingEntities = state.manualSync.syncingEntities.filter(id => id !== entityId);

    if (!currentAvailable) return {
      ...state,
      manualSync: {
        ...state.manualSync,
        syncingEntities: newSyncingEntities
      }
    };

    const updatedAvailable = currentAvailable.filter(entity => entity.id !== entityId);
    const currentSelection = state.manualSync[selectionKey] as SyncSelection;

    const updatedSelection: SyncSelection = {
      ...currentSelection,
      totalCount: updatedAvailable.length
    };

    return {
      ...state,
      manualSync: {
        ...state.manualSync,
        [listKey]: updatedAvailable,
        syncingEntities: newSyncingEntities,
        [selectionKey]: updatedSelection
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
