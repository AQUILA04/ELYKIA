import * as moment from 'moment';

export type StockPeriodKey = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | string;

export interface StockPeriodRange {
  startDate: string;
  endDate: string;
}

export interface MonthOption {
  value: string;
  label: string;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function buildPreviousMonthOptions(): MonthOption[] {
  const options: MonthOption[] = [];
  const currentMonth = moment().month();
  const currentYear = moment().year();

  if (currentMonth === 0) {
    options.push({ value: `PREV_MONTH_${currentYear - 1}_12`, label: 'Mois passé' });
  } else {
    for (let m = 0; m < currentMonth; m++) {
      options.push({
        value: `PREV_MONTH_${currentYear}_${m + 1}`,
        label: `${MONTH_NAMES[m]} ${currentYear}`
      });
    }
  }
  return options;
}

export function resolveStockPeriodRange(period: StockPeriodKey): StockPeriodRange {
  let startDate: string;
  let endDate = moment().format('YYYY-MM-DD');

  if (period === 'TODAY') {
    startDate = moment().format('YYYY-MM-DD');
  } else if (period === 'YESTERDAY') {
    startDate = moment().subtract(1, 'day').format('YYYY-MM-DD');
    endDate = startDate;
  } else if (period === 'WEEK') {
    startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
  } else if (period === 'MONTH') {
    startDate = moment().startOf('month').format('YYYY-MM-DD');
  } else if (period.startsWith('PREV_MONTH_')) {
    const parts = period.split('_');
    const year = parseInt(parts[2], 10);
    const month = parseInt(parts[3], 10);
    const date = moment().year(year).month(month - 1);
    startDate = date.startOf('month').format('YYYY-MM-DD');
    endDate = date.endOf('month').format('YYYY-MM-DD');
  } else {
    startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
  }

  return { startDate, endDate };
}

export function getStockPeriodLabel(period: StockPeriodKey): string {
  if (period === 'TODAY') return "Aujourd'hui";
  if (period === 'YESTERDAY') return 'Hier';
  if (period === 'WEEK') return 'Cette semaine';
  if (period === 'MONTH') return 'Ce mois';
  if (period.startsWith('PREV_MONTH_')) {
    const option = buildPreviousMonthOptions().find(o => o.value === period);
    return option?.label ?? 'Période';
  }
  return 'Période';
}
