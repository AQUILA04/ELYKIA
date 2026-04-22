export type SyncDateFilterOption = 'today' | '2days' | '3days' | 'week' | '2weeks' | 'month';

export interface DateFilter {
  startDate?: string;
  endDate?: string;
  dateColumn?: string;
}

export const SYNC_DATE_FILTER_LABELS: Record<SyncDateFilterOption, string> = {
  today: "Aujourd'hui",
  '2days': '2 derniers jours',
  '3days': '3 derniers jours',
  week: '1 semaine',
  '2weeks': '2 semaines',
  month: '1 mois',
};