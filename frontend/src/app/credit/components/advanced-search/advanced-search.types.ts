export class AdvancedSearchTypes {
}

// Types et interfaces pour la recherche avancée

export enum ClientType {
  CLIENT = 'CLIENT',
  PROMOTER = 'PROMOTER'
}

export enum OperationType {
  CREDIT = 'CREDIT',
  TONTINE = 'TONTINE'
}

export enum CreditStatus {
  CREATED = 'CREATED',
  VALIDATED = 'VALIDATED',
  INPROGRESS = 'INPROGRESS',
  DELIVERED = 'DELIVERED',
  ENDED = 'ENDED',
  SETTLED = 'SETTLED',
  MERGED = 'MERGED'
}

export interface CreditSearchDto {
  keyword?: string;
  clientType?: ClientType | null;
  type?: OperationType | null;
  status?: CreditStatus | null;
  commercial?: string | null;
}

export interface SearchOption {
  value: string | null;
  label: string;
}

// Options pour les dropdowns
export const CLIENT_TYPE_OPTIONS: SearchOption[] = [
  { value: null, label: 'Tous les types' },
  { value: ClientType.CLIENT, label: 'Client' },
  { value: ClientType.PROMOTER, label: 'Commercial' }
];

export const OPERATION_TYPE_OPTIONS: SearchOption[] = [
  { value: null, label: 'Tous les types' },
  { value: OperationType.CREDIT, label: 'Vente à crédit' },
  { value: OperationType.TONTINE, label: 'Tontine' }
];

export const STATUS_OPTIONS: SearchOption[] = [
  { value: null, label: 'Tous les statuts' },
  { value: CreditStatus.CREATED, label: 'Créé' },
  { value: CreditStatus.VALIDATED, label: 'Validé' },
  { value: CreditStatus.INPROGRESS, label: 'En cours' },
  { value: CreditStatus.DELIVERED, label: 'Livré' },
  { value: CreditStatus.ENDED, label: 'Terminé' },
  { value: CreditStatus.SETTLED, label: 'Réglé' },
  { value: CreditStatus.MERGED, label: 'Fusionné' }
];
