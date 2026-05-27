export const DAILY_CONSENT_MESSAGE_VERSION = 'v1';

export interface DailyConsentHistoryRecord {
  id: string;
  commercialUsername: string;
  /** Date calendaire (YYYY-MM-DD). */
  actionDate: string;
  /** Horodatage ISO de la validation. */
  consentedAt: string;
  /** Code affiché à l'utilisateur. */
  challengeCode: string;
  /** Code saisi par l'utilisateur (normalisé). */
  challengeEntered: string;
  consentMessageVersion: string;
}

/** Valeur stockée dans Capacitor Preferences pour un commercial. */
export interface DailyConsentPreferenceValue {
  consentCode: string;
  actionDate: string;
  consentedAt: string;
}
