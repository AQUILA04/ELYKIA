import { TontineMemberAmountHistory } from '../../tontine/types/tontine.types';
import {
  collectionEquivalentDays,
  getApplicableAmountForDate
} from '../../tontine/utils/tontine-amount-history.util';

export interface SpringPageMeta {
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

export interface SpringPagePayload<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  page?: SpringPageMeta;
}

export interface NormalizedPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface StakePeriod {
  amount: number;
  startDate: string;
  endDate?: string | null;
}

export interface CollectionLine {
  amount: number;
  collectionDate: string;
}

export interface MonthPillGroup {
  key: string;
  label: string;
  amount: number;
  days: number[];
  stakeLabel: string | null;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/** Spring Boot 3 places page counts under `page`, older payloads keep them at the root. */
export function readSpringPage<T>(
  data: SpringPagePayload<T> | null | undefined,
  fallbackPage: number,
  fallbackSize: number
): NormalizedPage<T> {
  const content = data?.content ?? [];
  const meta = data?.page;
  const totalElements = meta?.totalElements ?? data?.totalElements ?? content.length;
  const size = meta?.size ?? data?.size ?? fallbackSize;
  const number = meta?.number ?? data?.number ?? fallbackPage;
  const totalPages = meta?.totalPages
    ?? data?.totalPages
    ?? (size > 0 ? Math.ceil(totalElements / size) : 0);
  return { content, totalElements, totalPages, number, size };
}

/** Pastilles d'un mois : un numéro par jour complet de mise, du plus récent au plus ancien. */
export function buildMonthPills(
  collections: readonly CollectionLine[],
  periods: readonly StakePeriod[],
  fallbackDailyAmount: number
): MonthPillGroup[] {
  const history = toHistory(periods);
  const buckets = new Map<string, { amount: number; days: number; stakes: Set<number> }>();

  for (const line of collections) {
    const key = monthKey(line.collectionDate);
    if (!key) {
      continue;
    }
    const bucket = buckets.get(key) ?? { amount: 0, days: 0, stakes: new Set<number>() };
    const amount = line.amount ?? 0;
    bucket.amount += amount;
    bucket.days += collectionEquivalentDays(amount, line.collectionDate, history, fallbackDailyAmount);
    const stake = getApplicableAmountForDate(history, line.collectionDate, fallbackDailyAmount);
    if (stake > 0) {
      bucket.stakes.add(stake);
    }
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([key, bucket]) => ({
      key,
      label: monthLabel(key),
      amount: bucket.amount,
      days: dayNumbers(bucket.days),
      stakeLabel: stakeLabel(bucket.stakes)
    }));
}

function toHistory(periods: readonly StakePeriod[]): TontineMemberAmountHistory[] {
  return periods.map((period, index) => ({
    id: index,
    amount: period.amount,
    startDate: period.startDate,
    endDate: period.endDate ?? null
  }));
}

function monthKey(value: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(value ?? '');
  return match ? `${match[1]}-${match[2]}` : null;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const name = MONTHS[Number(month) - 1] ?? month;
  return `${name} ${year}`;
}

function dayNumbers(count: number): number[] {
  const total = Math.max(0, Math.floor(count));
  return Array.from({ length: total }, (_, index) => index + 1);
}

function stakeLabel(stakes: Set<number>): string | null {
  if (stakes.size !== 1) {
    return null;
  }
  const [amount] = stakes;
  return `Mise : ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}
