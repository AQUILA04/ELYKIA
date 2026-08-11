export type RmFieldControlStatus = 'CONFORME' | 'ECART';

export interface RmFieldControlOp {
  localId: string;
  reference: string;
  creditId: number;
  notebookTotalAmount: number;
  systemTotalAmountPaid: number;
  differenceAmount: number;
  status: RmFieldControlStatus;
  note?: string;
  clientName?: string;
  creditReference?: string;
  observedAt: string;
  createdAt: string;
  isSync: boolean;
  lastError?: string | null;
}

export interface RmFieldControlRequest {
  creditId: number;
  notebookTotalAmount: number;
  systemTotalAmountPaid: number;
  note?: string;
  clientName?: string;
  creditReference?: string;
  forceOffline?: boolean;
}

export interface RmFieldControlResult {
  op: RmFieldControlOp;
  mode: 'online' | 'offline';
}

export interface RmFieldControlDto {
  id?: number;
  creditId: number;
  reference: string;
  notebookTotalAmount: number;
  systemTotalAmountPaid: number;
  differenceAmount: number;
  status: RmFieldControlStatus;
  observedAt?: string;
  observedBy?: string;
  note?: string;
}
