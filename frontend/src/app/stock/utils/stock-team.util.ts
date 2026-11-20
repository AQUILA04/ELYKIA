import { CommercialMonthlyStock, CommercialMonthlyStockItem } from '../models/commercial-stock.model';
import { StockTeamLine } from '../models/stock-team.model';

/** Filtres de la vue équipe. */
export type TeamFilter = 'all' | 'remaining' | 'debt' | 'low';

/** Sous ce taux de recouvrement, un commercial est signalé (filtre « Recouvrement < 50 % »). */
export const LOW_RECOVERY_RATE = 50;

export interface MonthRef {
  year: number;
  month: number;
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août',
  'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function monthLabel(ref: MonthRef): string {
  return `${MONTHS[ref.month - 1] ?? ref.month} ${ref.year}`;
}

export function currentMonth(today: Date = new Date()): MonthRef {
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const index = ref.year * 12 + (ref.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareMonths(a: MonthRef, b: MonthRef): number {
  return (a.year - b.year) * 12 + (a.month - b.month);
}

/** Mois lu dans l'URL ; mois en cours si absent, invalide ou futur. */
export function monthFromParams(year: unknown, month: unknown, today: Date = new Date()): MonthRef {
  const now = currentMonth(today);
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12 || y < 2000) {
    return now;
  }
  const ref = { year: y, month: m };
  return compareMonths(ref, now) > 0 ? now : ref;
}

/** Jours restants avant la clôture du mois en cours (le 1er du mois suivant). */
export function daysBeforeClose(today: Date = new Date()): number {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return lastDay - today.getDate() + 1;
}

export function matchesFilter(line: StockTeamLine, filter: TeamFilter): boolean {
  switch (filter) {
    case 'remaining':
      return line.quantityRemaining > 0;
    case 'debt':
      return line.debtValue > 0.5;
    case 'low':
      return line.dueValue > 0.5 && line.recoveryRate < LOW_RECOVERY_RATE;
    default:
      return true;
  }
}

export function filterCounts(lines: StockTeamLine[]): Record<TeamFilter, number> {
  const count = (filter: TeamFilter) => lines.filter(line => matchesFilter(line, filter)).length;
  return { all: lines.length, remaining: count('remaining'), debt: count('debt'), low: count('low') };
}

/** Pourcentage borné 0-100, arrondi ; 0 si le total est nul. */
export function percent(part: number, total: number): number {
  if (!total || total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

/** Répartition des quantités prises : vendu, retourné, en dette, restant (somme = 100). */
export function quantitySplit(q: { taken: number; sold: number; returned: number; debt: number; remaining: number }):
  { sold: number; returned: number; debt: number; remaining: number } {
  if (!q.taken) {
    return { sold: 0, returned: 0, debt: 0, remaining: 0 };
  }
  const returned = percent(q.returned, q.taken);
  const debt = percent(q.debt, q.taken);
  const remaining = percent(q.remaining, q.taken);
  const sold = Math.max(0, 100 - returned - debt - remaining);
  return { sold, returned, debt, remaining };
}

export function articleLabel(item: CommercialMonthlyStockItem): string {
  const article = item.article ?? {};
  return [article.commercialName, article.name].filter(Boolean).join(' ') || `Article #${article.id ?? '?'}`;
}

/** Un article « à suivre » a encore un reste ou une dette. */
export function isOpenItem(item: CommercialMonthlyStockItem): boolean {
  return (item.quantityRemaining || 0) > 0 || (item.quantityDebt || 0) > 0;
}

export function remainingValue(item: CommercialMonthlyStockItem): number {
  return (item.quantityRemaining || 0) * (item.weightedAverageUnitPrice || 0);
}

export function debtValue(item: CommercialMonthlyStockItem): number {
  return (item.quantityDebt || 0) * (item.debtUnitPrice ?? item.weightedAverageUnitPrice ?? 0);
}

/** Articles de la fiche : à suivre d'abord (plus gros reste en valeur), puis par nom. */
export function sortItems(items: CommercialMonthlyStockItem[]): CommercialMonthlyStockItem[] {
  return [...items].sort((a, b) => {
    const open = Number(isOpenItem(b)) - Number(isOpenItem(a));
    if (open !== 0) {
      return open;
    }
    const value = (remainingValue(b) + debtValue(b)) - (remainingValue(a) + debtValue(a));
    if (Math.abs(value) > 0.5) {
      return value;
    }
    return articleLabel(a).localeCompare(articleLabel(b), 'fr');
  });
}

export function searchItems(items: CommercialMonthlyStockItem[], term: string): CommercialMonthlyStockItem[] {
  const query = normalize(term);
  if (!query) {
    return items;
  }
  return items.filter(item => normalize(articleLabel(item) + ' ' + (item.article?.marque ?? '')).includes(query));
}

export function normalize(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Totaux de la fiche, calculés comme l'écran stock : dû = vendu + dette + restant. */
export interface SheetTotals {
  quantityTaken: number;
  quantitySold: number;
  quantityReturned: number;
  quantityDebt: number;
  quantityRemaining: number;
  soldValue: number;
  debtValue: number;
  remainingValue: number;
  dueValue: number;
  recoveredValue: number;
  leftToRecover: number;
  recoveryRate: number;
  debtSettled: number;
  debtRemaining: number;
}

export function sheetTotals(stock: CommercialMonthlyStock): SheetTotals {
  const items = stock.items ?? [];
  const sum = (pick: (item: CommercialMonthlyStockItem) => number) =>
    items.reduce((total, item) => total + (pick(item) || 0), 0);
  const soldValue = sum(item => item.totalSoldValue ?? 0);
  const itemsDebtValue = sum(debtValue);
  const itemsRemainingValue = sum(remainingValue);
  const summary = stock.recoverySummary;
  const debt = summary?.debtValueAmount ?? itemsDebtValue;
  const due = summary?.totalDueAmount ?? soldValue + debt + itemsRemainingValue;
  const recovered = summary?.totalRecoveredAmount ?? 0;
  return {
    quantityTaken: sum(item => item.quantityTaken),
    quantitySold: sum(item => item.quantitySold),
    quantityReturned: sum(item => item.quantityReturned),
    quantityDebt: sum(item => item.quantityDebt ?? 0),
    quantityRemaining: sum(item => item.quantityRemaining),
    soldValue,
    debtValue: debt,
    remainingValue: itemsRemainingValue,
    dueValue: due,
    recoveredValue: recovered,
    leftToRecover: summary?.totalRemainingAmount ?? Math.max(0, due - recovered),
    recoveryRate: summary?.recoveryRatePercent ?? percent(recovered, due),
    debtSettled: summary?.debtSettledAmount ?? 0,
    debtRemaining: summary?.debtRemainingAmount ?? 0
  };
}
