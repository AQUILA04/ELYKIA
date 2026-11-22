export enum UrgencyLevel {
  TODAY = 'TODAY',
  TOMORROW = 'TOMORROW',
  THIS_WEEK = 'THIS_WEEK',
  FUTURE = 'FUTURE'
}

export interface CreditEcheanceDTO {
  id: number;
  reference: string;
  clientName: string;
  clientPhone: string;
  collector: string;
  totalAmount: number;
  totalAmountPaid: number;
  totalAmountRemaining: number;
  dailyStake: number;
  remainingDaysCount: number;
  paidPercentage: number;
  settled: boolean;
  beginDate: string;
  expectedEndDate: string;
  daysUntilEnd: number;
  urgencyLevel: UrgencyLevel;
  status: string;
}

export interface CreditEcheanceSummaryDTO {
  totalToday: number;
  totalWeek: number;
  totalUnsettled: number;
  totalAmountRemaining: number;
}

export interface CreditCalendarDayDTO {
  date: string;
  totalCount: number;
  unsettledCount: number;
  hasUrgent: boolean;
}
