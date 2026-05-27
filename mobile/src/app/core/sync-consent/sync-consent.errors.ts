/** Levée lorsque l'utilisateur annule ou refuse le consentement de synchronisation. */
export class SyncConsentCancelledError extends Error {
  constructor(message = 'Synchronisation annulée : consentement non accordé.') {
    super(message);
    this.name = 'SyncConsentCancelledError';
  }
}
