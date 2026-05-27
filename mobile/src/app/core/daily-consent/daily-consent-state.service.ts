import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { DailyConsentPreferenceValue } from './models/daily-consent-history.model';

@Injectable({ providedIn: 'root' })
export class DailyConsentStateService {
  private consentCode: string | null = null;
  private consentDate: string | null = null;
  private commercialUsername: string | null = null;

  private prefKey(username: string): string {
    return `daily_operation_consent_${username}`;
  }

  private todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  isConsentActiveForToday(username: string): boolean {
    return (
      this.commercialUsername === username &&
      this.consentDate === this.todayDate() &&
      this.consentCode !== null
    );
  }

  getActiveConsentCode(): string | null {
    return this.consentCode;
  }

  activateConsent(username: string, code: string): void {
    const today = this.todayDate();
    this.commercialUsername = username;
    this.consentCode = code;
    this.consentDate = today;

    const value: DailyConsentPreferenceValue = {
      consentCode: code,
      actionDate: today,
      consentedAt: new Date().toISOString()
    };
    Preferences.set({ key: this.prefKey(username), value: JSON.stringify(value) });
  }

  async restoreFromPreferences(username: string): Promise<void> {
    const { value } = await Preferences.get({ key: this.prefKey(username) });
    if (!value) return;

    try {
      const stored: DailyConsentPreferenceValue = JSON.parse(value);
      if (stored.actionDate === this.todayDate()) {
        this.commercialUsername = username;
        this.consentCode = stored.consentCode;
        this.consentDate = stored.actionDate;
      } else {
        await this.clearConsent(username);
      }
    } catch {
      await this.clearConsent(username);
    }
  }

  async clearConsent(username: string): Promise<void> {
    if (this.commercialUsername === username) {
      this.consentCode = null;
      this.consentDate = null;
      this.commercialUsername = null;
    }
    await Preferences.remove({ key: this.prefKey(username) });
  }
}
