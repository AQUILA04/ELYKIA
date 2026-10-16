export type FieldControlStatus = 'CONFORME' | 'ECART';

export interface TontineMemberFieldControlLineDto {
  id: number;
  year: number;
  /** Mois calendaire 1–12 (février = 2 … novembre = 11). */
  month: number;
  /** Null sur les contrôles historiques non découpés. */
  commercialUsername?: string | null;
  notebookAmount: number;
  systemAmount: number;
  differenceAmount: number;
}

export interface TontineMemberFieldControlCollectorDto {
  commercialUsername: string;
  notebookTotalAmount: number;
  systemTotalAmount: number;
  differenceAmount: number;
  status: FieldControlStatus;
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
  collectors?: TontineMemberFieldControlCollectorDto[];
  uncontrolledCollectors?: string[];
}

export interface CreateTontineMemberFieldControlMonthPayload {
  year: number;
  month: number;
  commercialUsername: string;
  notebookAmount: number;
}

export interface CreateTontineMemberFieldControlPayload {
  reference: string;
  months: CreateTontineMemberFieldControlMonthPayload[];
  observedAt?: string;
  note?: string;
}

/** Données d'entrée du modal : un commercial avec ses mois système. */
export interface TontineFieldControlCollectorOption {
  commercialUsername: string;
  currentCollector?: boolean;
  totalAmount: number;
  months: Array<{
    year: number;
    /** Index JS Date.getMonth() (Fév = 1 … Nov = 10). */
    jsMonth: number;
    monthName: string;
    totalAmount: number;
  }>;
}
