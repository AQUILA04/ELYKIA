import { Injectable } from '@angular/core';
import {
  SYNC_CONSENT_MESSAGE_VERSION,
  SyncConsentConfirmationPayload,
  SyncConsentHistoryRecord
} from './models/sync-consent-history.model';
import { SyncConsentHistoryRepository } from './repositories/sync-consent-history.repository';

/** Caractères lisibles (sans 0/O, 1/I). */
const CHALLENGE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable({ providedIn: 'root' })
export class SyncConsentService {

  constructor(private readonly historyRepository: SyncConsentHistoryRepository) {}

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
    payload: SyncConsentConfirmationPayload
  ): Promise<void> {
    const consentedAt = payload.consentedAt;
    const actionDate = consentedAt.slice(0, 10);

    const record: SyncConsentHistoryRecord = {
      id: this.generateId(),
      commercialUsername,
      actionDate,
      consentedAt,
      challengeCode: payload.challengeCode,
      challengeEntered: payload.challengeEntered,
      consentMessageVersion: SYNC_CONSENT_MESSAGE_VERSION
    };

    await this.historyRepository.insert(record);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
