import { TontineMemberAmountHistory } from '../types/tontine.types';

function parseDate(value: string): Date {
  return new Date(value);
}

function isActiveOnDate(entry: TontineMemberAmountHistory, date: Date): boolean {
  const start = parseDate(entry.startDate);
  if (start > date) {
    return false;
  }
  if (entry.endDate) {
    const end = parseDate(entry.endDate);
    return end >= date;
  }
  return true;
}

/** Montant journalier applicable à une date, aligné sur la logique backend/mobile. */
export function getApplicableAmountForDate(
  history: readonly TontineMemberAmountHistory[],
  dateStr: string,
  fallbackAmount: number
): number {
  if (!history.length) {
    return fallbackAmount;
  }

  const date = parseDate(dateStr);
  const applicable = history
    .filter(entry => isActiveOnDate(entry, date))
    .sort((a, b) => parseDate(b.startDate).getTime() - parseDate(a.startDate).getTime())[0];

  return applicable?.amount ?? fallbackAmount;
}

/** Jours entiers couverts par une collecte selon la mise en vigueur à la date de collecte. */
export function collectionEquivalentDays(
  amount: number,
  collectionDate: string,
  history: readonly TontineMemberAmountHistory[],
  fallbackAmount: number
): number {
  const daily = getApplicableAmountForDate(history, collectionDate, fallbackAmount);
  if (daily <= 0 || amount <= 0) {
    return 0;
  }
  return Math.floor(amount / daily);
}
