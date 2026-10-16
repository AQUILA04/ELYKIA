export type RmTontineFieldControlStatus = 'CONFORME' | 'ECART';

export interface RmTontineFieldControlMonthInput {
  year: number;
  month: number;
  commercialUsername: string;
  notebookAmount: number;
  systemAmount?: number;
}

export interface RmTontineFieldControlOp {
  localId: string;
  reference: string;
  tontineMemberId: number;
  clientName?: string;
  months: RmTontineFieldControlMonthInput[];
  notebookTotalAmount: number;
  systemTotalAmount: number;
  differenceAmount: number;
  status: RmTontineFieldControlStatus;
  note?: string;
  observedAt: string;
  createdAt: string;
  isSync: boolean;
  lastError?: string | null;
}

export interface RmTontineFieldControlRequest {
  tontineMemberId: number;
  clientName?: string;
  months: RmTontineFieldControlMonthInput[];
  note?: string;
  forceOffline?: boolean;
}

export interface RmTontineFieldControlResult {
  op: RmTontineFieldControlOp;
  mode: 'online' | 'offline';
}

export interface RmTontineFieldControlLineDto {
  id?: number;
  year: number;
  month: number;
  commercialUsername?: string;
  notebookAmount: number;
  systemAmount: number;
  differenceAmount: number;
}

export interface RmTontineFieldControlCollectorDto {
  commercialUsername: string;
  notebookTotalAmount: number;
  systemTotalAmount: number;
  differenceAmount: number;
  status: RmTontineFieldControlStatus;
}

export interface RmTontineFieldControlDto {
  id?: number;
  tontineMemberId: number;
  reference: string;
  notebookTotalAmount: number;
  systemTotalAmount: number;
  differenceAmount: number;
  status: RmTontineFieldControlStatus;
  observedAt?: string;
  observedBy?: string;
  note?: string;
  lines?: RmTontineFieldControlLineDto[];
  collectors?: RmTontineFieldControlCollectorDto[];
  uncontrolledCollectors?: string[];
}
