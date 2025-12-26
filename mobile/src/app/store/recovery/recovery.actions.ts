import { createAction, props } from '@ngrx/store';
import { Recovery } from '../../models/recovery.model';
import { Distribution } from '../../models/distribution.model';
import { Client } from '../../models/client.model';
import { PrintableRecovery } from '../../core/services/printing.service';

export const loadAndSelectClient = createAction(
  '[Recovery] Load And Select Client',
  props<{ clientId: string }>()
);

export const loadRecoveries = createAction(
  '[Recovery] Load Recoveries',
  props<{ commercialUsername: string }>()
);

export const loadRecoveriesSuccess = createAction(
  '[Recovery] Load Recoveries Success',
  props<{ recoveries: Recovery[] }>()
);

export const loadRecoveriesFailure = createAction(
  '[Recovery] Load Recoveries Failure',
  props<{ error: any }>()
);

// Nouvelles actions pour l'US008

export const setSelectedClient = createAction(
  '[Recovery] Set Selected Client',
  props<{ client: Client }>()
);

export const loadClientCredits = createAction(
  '[Recovery] Load Client Credits',
  props<{ clientId: string }>()
);

export const loadClientCreditsSuccess = createAction(
  '[Recovery] Load Client Credits Success',
  props<{ credits: Distribution[] }>()
);

export const loadClientCreditsFailure = createAction(
  '[Recovery] Load Client Credits Failure',
  props<{ error: any }>()
);

export const selectCredit = createAction(
  '[Recovery] Select Credit',
  props<{ distributionId: string }>()
);

export const setRecoveryAmount = createAction(
  '[Recovery] Set Recovery Amount',
  props<{ amount: number }>()
);

export const validateRecoveryAmount = createAction(
  '[Recovery] Validate Recovery Amount',
  props<{ amount: number, distributionId: string }>()
);

export const validateRecoveryAmountSuccess = createAction(
  '[Recovery] Validate Recovery Amount Success',
  props<{ isValid: boolean, message: string }>()
);

export const validateRecoveryAmountFailure = createAction(
  '[Recovery] Validate Recovery Amount Failure',
  props<{ error: any }>()
);

export const createRecovery = createAction(
  '[Recovery] Create Recovery',
  // AJOUTER la distribution à l'action
  props<{ recovery: Partial<Recovery>; distribution: Distribution }>()
);

export const createRecoverySuccess = createAction(
  '[Recovery] Create Recovery Success',
  props<{ recovery: Recovery }>()
);

export const createRecoveryFailure = createAction(
  '[Recovery] Create Recovery Failure',
  props<{ error: any }>()
);

export const clearRecoveryState = createAction(
  '[Recovery] Clear Recovery State'
);

export const resetRecoveryForm = createAction(
  '[Recovery] Reset Recovery Form'
);

export const showRecoverySummary = createAction(
  '[Recovery] Show Recovery Summary',
  props<{ recovery: Recovery, distribution: Distribution, client: Client }>()
);

export const printRecoveryReceipt = createAction(
  '[Recovery] Print Recovery Receipt',
  props<{ printableRecovery: PrintableRecovery }>()
);

export const printRecoveryReceiptSuccess = createAction(
  '[Recovery] Print Recovery Receipt Success'
);

export const printRecoveryReceiptFailure = createAction(
  '[Recovery] Print Recovery Receipt Failure',
  props<{ error: any }>()
);

export const deleteRecoveriesByDistributionIds = createAction(
  '[Recovery] Delete Recoveries By Distribution Ids',
  props<{ distributionIds: string[] }>()
);
