export class ConsentRequiredError extends Error {
  constructor(message = 'Consentement journalier requis.') {
    super(message);
    this.name = 'ConsentRequiredError';
  }
}

export class DailyConsentCancelledError extends Error {
  constructor(message = 'Consentement journalier annulé.') {
    super(message);
    this.name = 'DailyConsentCancelledError';
  }
}
