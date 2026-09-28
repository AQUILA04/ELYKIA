import { creditStatusChipClass, creditStatusLabel } from './credit-status-label';

describe('creditStatusLabel', () => {
  it('maps INPROGRESS to EN COURS', () => {
    expect(creditStatusLabel('INPROGRESS')).toBe('EN COURS');
  });

  it('maps other statuses', () => {
    expect(creditStatusLabel('LIVRE')).toBe('TERMINÉ');
    expect(creditStatusLabel('INITIE')).toBe('INITIÉ');
  });
});

describe('creditStatusChipClass', () => {
  it('uses gold chip for INPROGRESS', () => {
    expect(creditStatusChipClass('INPROGRESS')).toBe('elyk-chip--gold');
  });
});
