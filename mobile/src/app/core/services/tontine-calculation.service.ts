import { Injectable } from '@angular/core';
import { ParameterService } from './parameter.service';
import { TontineMember, TontineSession } from 'src/app/models/tontine.model';
import { TontineMemberAmountHistoryRepository } from '../repositories/tontine-member-amount-history.repository';

@Injectable({
  providedIn: 'root'
})
export class TontineCalculationService {

  constructor(
    private parameterService: ParameterService,
    private historyRepo: TontineMemberAmountHistoryRepository
  ) { }

  /**
   * Calculates the financial status of a tontine member, including society share and available budget.
   *
   * @param member The tontine member.
   * @param session The tontine session.
   * @param totalCollected The total amount collected from the member so far.
   * @returns An object containing the calculated values.
   */
  async calculateMemberStatus(member: TontineMember, session: TontineSession, totalCollected: number) {
    const useRegistrationDate = await this.parameterService.isEnabled('USE_MEMBER_REGISTRATION_DATE_FOR_SHARE');

    let startDate = new Date(session.startDate);
    const now = new Date();

    if (useRegistrationDate && member.registrationDate) {
      const regDate = new Date(member.registrationDate);
      if (regDate > startDate) {
        startDate = regDate;
      }
    }

    // Fetch history
    const history = await this.historyRepo.getByMemberId(member.id);

    let targetSocietyShare = 0;
    let monthsStarted = 0;
    const MAX_MONTHS = 10;

    // Iterate month by month
    let iterDate = new Date(startDate);
    // Set to first day of month to align with logic
    iterDate.setDate(1);

    // If start date was mid-month, we still count that month as started?
    // Logic says: "Calculate months elapsed since start (inclusive of current month)"
    // So if start is Feb 15, and now is Feb 20, monthsStarted = 1.

    // Let's align iterDate to the actual start date month
    iterDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (iterDate <= now && monthsStarted < MAX_MONTHS) {
        // Find applicable amount for this month
        // We need the amount valid at the end of this month (or today if current month)
        let monthEndDate = new Date(iterDate.getFullYear(), iterDate.getMonth() + 1, 0);
        if (monthEndDate > now) {
            monthEndDate = now;
        }

        const applicableAmount = this.getApplicableAmount(history, monthEndDate, member.amount || 0);
        targetSocietyShare += applicableAmount;

        monthsStarted++;
        // Move to next month
        iterDate = new Date(iterDate.getFullYear(), iterDate.getMonth() + 1, 1);
    }

    // The society share cannot exceed what has been collected
    const societyShare = Math.min(totalCollected, targetSocietyShare);

    // Available budget is what remains after deducting the society share
    const availableBudget = totalCollected - societyShare;

    return {
      totalCollected,
      societyShare,
      availableBudget,
      monthsStarted,
      targetSocietyShare
    };
  }

  private getApplicableAmount(history: any[], date: Date, currentAmount: number): number {
      if (!history || history.length === 0) {
          return currentAmount;
      }

      // Sort history by startDate descending (latest first)
      // Filter entries that started on or before the date
      const validEntry = history
          .filter(h => new Date(h.startDate) <= date)
          .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

      return validEntry ? validEntry.amount : currentAmount;
  }
}
