export type FieldControlStatus = 'CONFORME' | 'ECART';

export interface CreditFieldControlDto {
  id: number;
  creditId: number;
  notebookTotalAmount: number;
  systemTotalAmountPaid: number;
  differenceAmount: number;
  status: FieldControlStatus;
  observedAt: string;
  observedBy: string;
  note?: string | null;
}

export interface CreateCreditFieldControlPayload {
  notebookTotalAmount: number;
  observedAt?: string;
  note?: string;
}
