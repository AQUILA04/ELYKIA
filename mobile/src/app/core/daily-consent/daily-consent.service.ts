import { Injectable } from '@angular/core';
import {
  DAILY_CONSENT_MESSAGE_VERSION,
  DailyConsentHistoryRecord
} from './models/daily-consent-history.model';
import { DailyConsentHistoryRepository } from './repositories/daily-consent-history.repository';
import { DailyConsentStateService } from './daily-consent-state.service';

const CHALLENGE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable({ providedIn: 'root' })
export class DailyConsentService {

  constructor(
    private readonly historyRepository: DailyConsentHistoryRepository,
    private readonly stateService: DailyConsentStateService
  ) {}

  generateChallengeCode(length = 6): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += CHALLENGE_CHARSET[Math.floor(Math.random() * CHALLENGE_CHARSET.length)];
    }
    return code;
  }

  normalizeChallengeInput(value: string): string {
    return value.trim().toUpperCase();
  }

  async recordConsent(
    commercialUsername: string,
    challengeCode: string,
    challengeEntered: string
  ): Promise<void> {
    const consentedAt = new Date().toISOString();
    const actionDate = consentedAt.slice(0, 10);

    const record: DailyConsentHistoryRecord = {
      id: this.generateId(),
      commercialUsername,
      actionDate,
      consentedAt,
      challengeCode,
      challengeEntered,
      consentMessageVersion: DAILY_CONSENT_MESSAGE_VERSION
    };

    this.stateService.activateConsent(commercialUsername, challengeCode);
    await this.historyRepository.insert(record);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
