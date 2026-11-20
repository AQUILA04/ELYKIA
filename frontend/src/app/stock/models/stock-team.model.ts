/** Stock d'un commercial sur un mois (GET /api/commercial-stocks/team-overview). */
export interface StockTeamLine {
  stockId: number;
  collector: string;
  itemsCount: number;
  itemsWithRemaining: number;
  quantityTaken: number;
  quantitySold: number;
  quantityReturned: number;
  quantityRemaining: number;
  takenValue: number;
  soldValue: number;
  returnedValue: number;
  remainingValue: number;
  debtValue: number;
  dueValue: number;
  recoveredValue: number;
  leftToRecover: number;
  recoveryRate: number;
  soldRate: number;
  merchandiseDebtId: number | null;
  debtStatus: string | null;
  debtRemaining: number;
  toSettle: boolean;
}

export interface StockTeamTotals {
  quantityTaken: number;
  quantitySold: number;
  quantityReturned: number;
  quantityRemaining: number;
  takenValue: number;
  soldValue: number;
  returnedValue: number;
  remainingValue: number;
  debtValue: number;
  dueValue: number;
  recoveredValue: number;
  leftToRecover: number;
  recoveryRate: number;
  soldRate: number;
  commercialsCount: number;
}

export interface StockTeamOverview {
  year: number;
  month: number;
  closed: boolean;
  totals: StockTeamTotals;
  lines: StockTeamLine[];
}
