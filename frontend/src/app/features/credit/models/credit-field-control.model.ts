export type FieldControlStatus = 'CONFORME' | 'ECART';

export interface CreditFieldControlDto {
  id: number;
  creditId: number;
  reference?: string;
  notebookTotalAmount: number;
  systemTotalAmountPaid: number;
  differenceAmount: number;
  status: FieldControlStatus;
  observedAt: string;
  observedBy: string;
  note?: string | null;
}

export interface CreateCreditFieldControlPayload {
  reference: string;
  notebookTotalAmount: number;
  observedAt?: string;
  note?: string;
}
