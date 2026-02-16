import { createReducer, on } from '@ngrx/store';
import * as RecoveryActions from './recovery.actions';
import { Recovery } from '../../models/recovery.model';
import { Distribution } from '../../models/distribution.model';
import { Client } from '../../models/client.model';

export interface RecoveryState {
  recoveries: Recovery[];
  loading: boolean;
  error: any;

  // Nouveaux états pour l'US008
  selectedClient: Client | null;
  clientCredits: Distribution[];
  selectedCredit: Distribution | null;
  recoveryAmount: number;
  validationResult: {
    isValid: boolean;
    message: string;
  } | null;
  isCreatingRecovery: boolean;
  createRecoveryError: any;
}

export const initialState: RecoveryState = {
  recoveries: [],
  loading: false,
  error: null,

  // Nouveaux états initiaux
  selectedClient: null,
  clientCredits: [],
  selectedCredit: null,
  recoveryAmount: 0,
  validationResult: null,
  isCreatingRecovery: false,
  createRecoveryError: null,
};

export const recoveryReducer = createReducer(
  initialState,
  on(RecoveryActions.loadRecoveries, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(RecoveryActions.loadRecoveriesSuccess, (state, { recoveries }) => ({
    ...state,
    recoveries,
    loading: false,
    error: null,
  })),
  on(RecoveryActions.loadRecoveriesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Nouveaux reducers pour l'US008
  on(RecoveryActions.setSelectedClient, (state, { client }) => ({
    ...state,
    selectedClient: client,
    clientCredits: [],
    selectedCredit: null,
    recoveryAmount: 0,
    validationResult: null,
  })),

  on(RecoveryActions.loadClientCredits, (state) => ({
    ...state,
    loading: true,
    error: null,
    clientCredits: [],
  })),

  on(RecoveryActions.loadClientCreditsSuccess, (state, { credits }) => ({
    ...state,
    clientCredits: credits,
    loading: false,
    error: null,
  })),

  on(RecoveryActions.loadClientCreditsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    clientCredits: [],
  })),

  on(RecoveryActions.selectCredit, (state, { distributionId }) => {
    const selectedCredit = state.clientCredits.find(credit => credit.id === distributionId) || null;
    return {
      ...state,
      selectedCredit,
      recoveryAmount: 0,
      validationResult: null,
    };
  }),

  on(RecoveryActions.setRecoveryAmount, (state, { amount }) => ({
    ...state,
    recoveryAmount: amount,
  })),

  on(RecoveryActions.validateRecoveryAmount, (state) => ({
    ...state,
    validationResult: null,
  })),

  on(RecoveryActions.validateRecoveryAmountSuccess, (state, { isValid, message }) => ({
    ...state,
    validationResult: { isValid, message },
  })),

  on(RecoveryActions.validateRecoveryAmountFailure, (state, { error }) => ({
    ...state,
    validationResult: { isValid: false, message: 'Erreur de validation' },
    error,
  })),

  on(RecoveryActions.createRecovery, (state) => ({
    ...state,
    isCreatingRecovery: true,
    createRecoveryError: null,
  })),

  on(RecoveryActions.createRecoverySuccess, (state, { recovery }) => ({
    ...state,
    recoveries: [...state.recoveries, recovery],
    isCreatingRecovery: false,
    createRecoveryError: null,
  })),

  on(RecoveryActions.createRecoveryFailure, (state, { error }) => ({
    ...state,
    isCreatingRecovery: false,
    createRecoveryError: error,
  })),

  on(RecoveryActions.clearRecoveryState, () => initialState),

  on(RecoveryActions.resetRecoveryForm, (state) => ({
    ...state,
    selectedClient: null,
    clientCredits: [],
    selectedCredit: null,
    recoveryAmount: 0,
    validationResult: null,
    createRecoveryError: null,
  })),

  on(RecoveryActions.deleteRecoveriesByDistributionIds, (state, { distributionIds }) => ({
    ...state,
    recoveries: state.recoveries.filter(r => !distributionIds.includes(r.distributionId)),
  }))
);