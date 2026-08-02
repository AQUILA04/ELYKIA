export type FieldControlStatus = 'CONFORME' | 'ECART';

export interface TontineMemberFieldControlLineDto {
  id: number;
  year: number;
  /** Mois calendaire 1–12 (février = 2 … novembre = 11). */
  month: number;
  notebookAmount: number;
  systemAmount: number;
  differenceAmount: number;
}

export interface TontineMemberFieldControlDto {
  id: number;
  tontineMemberId: number;
  reference?: string;
  notebookTotalAmount: number;
  systemTotalAmount: number;
  differenceAmount: number;
  status: FieldControlStatus;
  observedAt: string;
  observedBy: string;
  note?: string | null;
  lines: TontineMemberFieldControlLineDto[];
}

export interface CreateTontineMemberFieldControlMonthPayload {
  year: number;
  month: number;
  notebookAmount: number;
}

export interface CreateTontineMemberFieldControlPayload {
  reference: string;
  months: CreateTontineMemberFieldControlMonthPayload[];
  observedAt?: string;
  note?: string;
}
