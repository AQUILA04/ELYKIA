// Enhanced TypeScript types for credit merge functionality

export interface Collector {
  readonly username: string;
  readonly firstname: string;
  readonly lastname: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface CreditMergeState {
  readonly selectedCommercial: string;
  readonly selectedCreditIds: readonly number[];
  readonly loading: boolean;
  readonly merging: boolean;
  readonly showValidationMessages: boolean;
}

export interface CreditMergeValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationErrors;
}

// Type guards for runtime type checking
export const isValidCollector = (obj: any): obj is Collector => {
  return obj &&
    typeof obj.username === 'string' &&
    typeof obj.firstname === 'string' &&
    typeof obj.lastname === 'string' &&
    obj.username.trim().length > 0 &&
    obj.firstname.trim().length > 0 &&
    obj.lastname.trim().length > 0;
};

export const isValidCreditId = (id: any): id is number => {
  return typeof id === 'number' && 
    Number.isInteger(id) && 
    id > 0;
};

export const isValidCreditIdArray = (ids: any): ids is number[] => {
  return Array.isArray(ids) && 
    ids.length >= 2 && 
    ids.length <= 10 &&
    ids.every(isValidCreditId);
};

// Constants for validation
export const CREDIT_MERGE_CONSTANTS = {
  MIN_CREDITS_TO_MERGE: 2,
  MAX_CREDITS_TO_MERGE: 10,
  MAX_USERNAME_LENGTH: 50,
  MAX_NAME_LENGTH: 100
} as const;

// Validation messages
export const VALIDATION_MESSAGES = {
  COMMERCIAL_REQUIRED: 'Veuillez sélectionner un commercial',
  COMMERCIAL_INVALID: 'Commercial sélectionné invalide',
  CREDITS_MIN_REQUIRED: 'Veuillez sélectionner au moins 2 crédits à fusionner',
  CREDITS_MAX_EXCEEDED: 'Vous ne pouvez pas fusionner plus de 10 crédits à la fois',
  CREDITS_INVALID: 'Sélection de crédits invalide',
  CREDITS_UNAVAILABLE: 'Certains crédits sélectionnés ne sont plus disponibles'
} as const;