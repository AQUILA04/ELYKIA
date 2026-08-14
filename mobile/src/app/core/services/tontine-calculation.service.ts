import { Injectable } from '@angular/core';
import { ParameterService } from './parameter.service';
import { TontineCollection, TontineMember, TontineSession } from 'src/app/models/tontine.model';
import { TontineMemberAmountHistory, TontineMemberAmountHistoryRepository } from '../repositories/tontine-member-amount-history.repository';
import { SocietyShareVersion, toContributionMonth, toDateOnlyString } from './tontine-allocation.mapper';

export class TontineAllocationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TontineAllocationValidationError';
  }
}

export interface TontineMemberAllocationStatus {
  version: SocietyShareVersion;
  totalCollected: number;
  societyShare: number;
  availableBudget: number;
  validatedMonths: number;
  currentMonthDays: number;
  monthsStarted: number;
  targetSocietyShare: number;
  isOfflineEstimate: boolean;
  isExact: boolean;
  collections: TontineCollection[];
}

interface MutableMemberState {
  totalContribution: number;
  societyShare: number;
  availableContribution: number;
  validatedMonths: number;
  currentMonthDays: number;
  amount: number;
}

interface V2MonthBucket {
  month: string;
  dailyAmount: number;
  societyShareTarget: number;
  societySharePaid: number;
  capital: number;
}

const DAYS_PER_MONTH = 31;
const MAX_MONTHS = 10;

@Injectable({
  providedIn: 'root'
})
export class TontineCalculationService {

  constructor(
    private parameterService: ParameterService,
    private historyRepo: TontineMemberAmountHistoryRepository
  ) { }

  async calculateMemberStatus(
    member: TontineMember,
    session: TontineSession,
    collections: TontineCollection[] = []
  ): Promise<TontineMemberAllocationStatus> {
    const version = await this.parameterService.getSocietyShareVersion();
    const useRegistrationDate = await this.parameterService.isEnabled('USE_MEMBER_REGISTRATION_DATE_FOR_SHARE');
    const history = await this.historyRepo.getByMemberId(member.id);
    const ordered = this.sortCollections(collections);
    const isOfflineEstimate = ordered.some(collection => collection.isLocal && !collection.isSync);
    const isExact = version === 'V1'
      || ordered.every(collection => !!collection.contributionMonth);

    if (version === 'V2') {
      return this.calculateV2(member, ordered, history, isOfflineEstimate, isExact);
    }
    return this.calculateV1(member, session, ordered, history, useRegistrationDate, isOfflineEstimate, isExact);
  }

  private sortCollections(collections: TontineCollection[]): TontineCollection[] {
    return [...collections].sort((left, right) => {
      const leftDate = toDateOnlyString(left.collectionDate) || '';
      const rightDate = toDateOnlyString(right.collectionDate) || '';
      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate);
      }
      return String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
    });
  }

  private calculateV1(
    member: TontineMember,
    session: TontineSession,
    collections: TontineCollection[],
    history: TontineMemberAmountHistory[],
    useRegistrationDate: boolean,
    isOfflineEstimate: boolean,
    isExact: boolean
  ): TontineMemberAllocationStatus {
    const state: MutableMemberState = {
      totalContribution: 0,
      societyShare: 0,
      availableContribution: 0,
      validatedMonths: 0,
      currentMonthDays: 0,
      amount: member.amount || 0
    };

    const allocated = collections.map(collection => {
      const allocationDate = this.toLocalDate(collection.collectionDate);
      const amountCollected = collection.amount || 0;
      const societyShareAmount = this.processV1Collection(
        member, session, state, history, useRegistrationDate, amountCollected, allocationDate
      );
      return {
        ...collection,
        societyShareAmount,
        contributionMonth: collection.contributionMonth || toContributionMonth(null, collection.collectionDate),
        advanceToNextMonth: collection.advanceToNextMonth === true
      };
    });

    const lastDate = collections.length
      ? this.toLocalDate(collections[collections.length - 1].collectionDate)
      : this.toLocalDate(session.startDate);
    const targetSocietyShare = this.calculateV1TargetSocietyShare(
      member, session, history, useRegistrationDate, lastDate
    );
    const monthsStarted = this.countStartedMonths(member, session, useRegistrationDate, lastDate);

    return {
      version: 'V1',
      totalCollected: state.totalContribution,
      societyShare: state.societyShare,
      availableBudget: state.availableContribution,
      validatedMonths: state.validatedMonths,
      currentMonthDays: state.currentMonthDays,
      monthsStarted,
      targetSocietyShare,
      isOfflineEstimate,
      isExact,
      collections: allocated
    };
  }

  private processV1Collection(
    member: TontineMember,
    session: TontineSession,
    state: MutableMemberState,
    history: TontineMemberAmountHistory[],
    useRegistrationDate: boolean,
    amountCollected: number,
    allocationDate: Date
  ): number {
    const targetSocietyShare = this.calculateV1TargetSocietyShare(
      member, session, history, useRegistrationDate, allocationDate
    );
    const societyShareDeficit = Math.max(0, targetSocietyShare - state.societyShare);
    const amountForSociety = societyShareDeficit > 0 ? Math.min(amountCollected, societyShareDeficit) : 0;

    state.societyShare += amountForSociety;
    state.totalContribution += amountCollected;
    this.refreshV1MemberStatus(state);
    return amountForSociety;
  }

  private calculateV1TargetSocietyShare(
    member: TontineMember,
    session: TontineSession,
    history: TontineMemberAmountHistory[],
    useRegistrationDate: boolean,
    upToDateInclusive: Date
  ): number {
    let iterDate = this.getEffectiveMemberStartDate(member, session, useRegistrationDate);
    let targetSocietyShare = 0;
    let monthsCounted = 0;

    while (iterDate.getTime() <= upToDateInclusive.getTime() && monthsCounted < MAX_MONTHS) {
      targetSocietyShare += this.getApplicableAmountForDate(history, iterDate, upToDateInclusive, member.amount || 0);
      monthsCounted++;
      iterDate = new Date(iterDate.getFullYear(), iterDate.getMonth() + 1, iterDate.getDate());
    }
    return targetSocietyShare;
  }

  private countStartedMonths(
    member: TontineMember,
    session: TontineSession,
    useRegistrationDate: boolean,
    upToDateInclusive: Date
  ): number {
    const start = this.getEffectiveMemberStartDate(member, session, useRegistrationDate);
    let iterDate = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(upToDateInclusive.getFullYear(), upToDateInclusive.getMonth(), 1);
    let monthsStarted = 0;
    while (iterDate.getTime() <= end.getTime() && monthsStarted < MAX_MONTHS) {
      monthsStarted++;
      iterDate = new Date(iterDate.getFullYear(), iterDate.getMonth() + 1, 1);
    }
    return monthsStarted;
  }

  private refreshV1MemberStatus(state: MutableMemberState): void {
    if (!state.amount) {
      return;
    }
    const availableContribution = Math.max(0, state.totalContribution - state.societyShare);
    const totalDaysAvailable = Math.trunc(availableContribution / state.amount);
    let validatedMonths = Math.trunc(totalDaysAvailable / DAYS_PER_MONTH);
    let remainderDays = totalDaysAvailable % DAYS_PER_MONTH;
    if (validatedMonths >= MAX_MONTHS) {
      validatedMonths = MAX_MONTHS;
      remainderDays = 0;
    }
    state.validatedMonths = validatedMonths;
    state.currentMonthDays = remainderDays;
    state.availableContribution = availableContribution;
  }

  private calculateV2(
    member: TontineMember,
    collections: TontineCollection[],
    history: TontineMemberAmountHistory[],
    isOfflineEstimate: boolean,
    isExact: boolean
  ): TontineMemberAllocationStatus {
    const months = new Map<string, V2MonthBucket>();
    const openedSocietyMonths = new Set<string>();
    let totalContribution = 0;
    let totalSocietyShare = 0;

    const getOrCreate = (month: string): V2MonthBucket => {
      let bucket = months.get(month);
      if (!bucket) {
        bucket = {
          month,
          dailyAmount: this.getDailyAmountForMonth(member, history, month),
          societyShareTarget: 0,
          societySharePaid: 0,
          capital: 0
        };
        months.set(month, bucket);
      }
      return bucket;
    };

    const openMonthForSocietyShareIfNeeded = (bucket: V2MonthBucket): void => {
      if (bucket.societyShareTarget > 0) {
        return;
      }
      if (openedSocietyMonths.size >= MAX_MONTHS) {
        return;
      }
      bucket.societyShareTarget = bucket.dailyAmount;
      openedSocietyMonths.add(bucket.month);
    };

    const paySocietyShare = (month: string, amount: number): number => {
      const bucket = getOrCreate(month);
      openMonthForSocietyShareIfNeeded(bucket);
      const deficit = Math.max(0, bucket.societyShareTarget - bucket.societySharePaid);
      const paid = Math.min(amount, deficit);
      bucket.societySharePaid += paid;
      totalSocietyShare += paid;
      return paid;
    };

    const addCapital = (month: string, capitalAmount: number): void => {
      if (capitalAmount <= 0) {
        return;
      }
      getOrCreate(month).capital += capitalAmount;
    };

    const applyAmountToMonth = (month: string, amount: number): number => {
      const society = paySocietyShare(month, amount);
      addCapital(month, amount - society);
      return society;
    };

    const daysInMonth = (bucket: V2MonthBucket): number => {
      if (bucket.dailyAmount <= 0) {
        return 0;
      }
      return Math.trunc(bucket.capital / bucket.dailyAmount);
    };

    const allocated = collections.map(collection => {
      const allocationDate = toDateOnlyString(collection.collectionDate);
      const baseMonth = (toContributionMonth(collection.contributionMonth, collection.collectionDate)
        || `${allocationDate?.substring(0, 7)}-01`).substring(0, 7);
      const advance = collection.advanceToNextMonth === true;
      const amount = collection.amount || 0;
      let societyShareAmount = 0;
      let resolvedContributionMonth = `${baseMonth}-01`;

      if (!advance) {
        societyShareAmount = applyAmountToMonth(baseMonth, amount);
      } else {
        const bucket = getOrCreate(baseMonth);
        const currentDays = daysInMonth(bucket);
        if (currentDays >= DAYS_PER_MONTH) {
          const nextMonth = this.plusMonths(baseMonth, 1);
          societyShareAmount = applyAmountToMonth(nextMonth, amount);
          resolvedContributionMonth = `${nextMonth}-01`;
        } else {
          let remaining = amount;
          const societyOnCurrent = paySocietyShare(baseMonth, remaining);
          remaining -= societyOnCurrent;
          const capitalNeededFor31 = Math.max(0, (DAYS_PER_MONTH - currentDays) * bucket.dailyAmount);
          if (remaining <= capitalNeededFor31 + 0.0001) {
            const projectedDays = currentDays + (bucket.dailyAmount > 0 ? Math.trunc(remaining / bucket.dailyAmount) : 0);
            if (projectedDays < DAYS_PER_MONTH) {
              throw new TontineAllocationValidationError(
                "Impossible de passer au mois suivant : le mois courant n'atteint pas 31 jours de cotisation."
              );
            }
            addCapital(baseMonth, remaining);
            societyShareAmount = societyOnCurrent;
          } else {
            addCapital(baseMonth, capitalNeededFor31);
            const overflow = remaining - capitalNeededFor31;
            const nextMonth = this.plusMonths(baseMonth, 1);
            const societyOnNext = applyAmountToMonth(nextMonth, overflow);
            societyShareAmount = societyOnCurrent + societyOnNext;
            resolvedContributionMonth = `${nextMonth}-01`;
          }
        }
      }

      totalContribution += amount;
      return {
        ...collection,
        societyShareAmount,
        contributionMonth: resolvedContributionMonth,
        advanceToNextMonth: advance
      };
    });

    const orderedMonths = Array.from(months.keys()).sort();
    let validatedMonths = 0;
    let latestDays = 0;
    for (const month of orderedMonths) {
      const bucket = months.get(month)!;
      if (bucket.capital <= 0 && bucket.societySharePaid <= 0) {
        continue;
      }
      const days = daysInMonth(bucket);
      if (days >= DAYS_PER_MONTH && validatedMonths < MAX_MONTHS) {
        validatedMonths++;
      }
      latestDays = days;
    }

    return {
      version: 'V2',
      totalCollected: totalContribution,
      societyShare: totalSocietyShare,
      availableBudget: Math.max(0, totalContribution - totalSocietyShare),
      validatedMonths,
      currentMonthDays: orderedMonths.length ? latestDays : 0,
      monthsStarted: openedSocietyMonths.size,
      targetSocietyShare: totalSocietyShare,
      isOfflineEstimate,
      isExact,
      collections: allocated
    };
  }

  private getEffectiveMemberStartDate(
    member: TontineMember,
    session: TontineSession,
    useRegistrationDate: boolean
  ): Date {
    let startDate = this.toLocalDate(session.startDate);
    if (useRegistrationDate && member.registrationDate) {
      const regDate = this.toLocalDate(member.registrationDate);
      if (regDate.getTime() > startDate.getTime()) {
        startDate = regDate;
      }
    }
    return startDate;
  }

  private getApplicableAmountForDate(
    history: TontineMemberAmountHistory[],
    date: Date,
    referenceDate: Date,
    currentAmount: number
  ): number {
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const lookupDate = monthEnd.getTime() > referenceDate.getTime() ? referenceDate : monthEnd;

    if (!history || history.length === 0) {
      return currentAmount;
    }

    const validEntry = history
      .filter(entry => this.toLocalDate(entry.startDate).getTime() <= lookupDate.getTime())
      .filter(entry => !entry.endDate || this.toLocalDate(entry.endDate).getTime() >= lookupDate.getTime())
      .sort((left, right) => this.toLocalDate(right.startDate).getTime() - this.toLocalDate(left.startDate).getTime())[0];

    return validEntry ? validEntry.amount : currentAmount;
  }

  private getDailyAmountForMonth(member: TontineMember, history: TontineMemberAmountHistory[], yearMonth: string): number {
    const [year, month] = yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0);
    const amount = this.getApplicableAmountForDate(history, lastDay, lastDay, member.amount || 0);
    return amount > 0 ? amount : 0;
  }

  private plusMonths(yearMonth: string, count: number): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + count, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private toLocalDate(value: string): Date {
    const ymd = toDateOnlyString(value);
    if (!ymd) {
      return new Date(NaN);
    }
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
