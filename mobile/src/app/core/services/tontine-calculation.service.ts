import { Injectable } from '@angular/core';
import { ParameterService } from './parameter.service';
import { TontineMember, TontineSession } from 'src/app/models/tontine.model';

@Injectable({
  providedIn: 'root'
})
export class TontineCalculationService {

  constructor(private parameterService: ParameterService) { }

  /**
   * Calculates the financial status of a tontine member, including society share and available budget.
   *
   * @param member The tontine member.
   * @param session The tontine session.
   * @param totalCollected The total amount collected from the member so far.
   * @returns An object containing the calculated values.
   */
  async calculateMemberStatus(member: TontineMember, session: TontineSession, totalCollected: number) {
    const dailyAmount = member.amount || 0;
    const useRegistrationDate = await this.parameterService.isEnabled('USE_MEMBER_REGISTRATION_DATE_FOR_SHARE');

    let startDate = new Date(session.startDate);
    const now = new Date();

    if (useRegistrationDate && member.registrationDate) {
      const regDate = new Date(member.registrationDate);
      if (regDate > startDate) {
        startDate = regDate;
      }
    }

    let monthsStarted = 0;
    if (now >= startDate) {
      // Calculate months difference
      monthsStarted = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
    }

    const MAX_MONTHS = 10;
    if (monthsStarted > MAX_MONTHS) {
      monthsStarted = MAX_MONTHS;
    }
    if (monthsStarted < 0) {
      monthsStarted = 0;
    }

    const targetSocietyShare = monthsStarted * dailyAmount;

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
}
