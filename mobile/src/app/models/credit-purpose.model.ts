export type CreditPurpose = 'PERSONAL' | 'BUSINESS' | 'EVENT';

export interface ClientAdhesionSnapshot {
  adhesionType: CreditPurpose;
  status: string;
  balance: number;
  creditCeiling: number;
  adhesionFee?: number;
  feeWaived?: boolean;
}
