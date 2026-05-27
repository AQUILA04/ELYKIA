/** Version du texte de consentement affiché à l'utilisateur. */
export const SYNC_CONSENT_MESSAGE_VERSION = 'v1';

/** Enregistrement d'un consentement explicite avant une session de synchronisation. */
export interface SyncConsentHistoryRecord {
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

export interface SyncConsentConfirmationPayload {
  challengeCode: string;
  challengeEntered: string;
  consentedAt: string;
}
