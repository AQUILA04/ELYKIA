import { RmPackTontineMember } from '../../../core/services/rm/rm.models';
import { memberLacksDailyAmount, resolveMonthMise } from './rm-tontine-month-mise';

describe('resolveMonthMise', () => {
  it('uses the stake in force for the month', () => {
    expect(resolveMonthMise(300, 1000)).toBe(300);
    expect(resolveMonthMise(1000, 1000)).toBe(1000);
  });

  it('falls back to the current stake when the pack has no monthly stake', () => {
    expect(resolveMonthMise(undefined, 1000)).toBe(1000);
    expect(resolveMonthMise(null, 1000)).toBe(1000);
  });

  it('keeps an explicit zero so the month is typed by hand', () => {
    expect(resolveMonthMise(0, 1000)).toBe(0);
  });
});

describe('memberLacksDailyAmount', () => {
  const member = (dailyAmount?: number): RmPackTontineMember => ({
    id: 1,
    amount: 1000,
    months: [{ year: 2026, month: 10, systemAmount: 9300, dailyAmount }],
    collectors: [{
      commercialUsername: 'com1',
      months: [{ year: 2026, month: 10, systemAmount: 9300, dailyAmount }]
    }]
  });

  it('asks for a reload when an older pack omits the monthly stake', () => {
    expect(memberLacksDailyAmount(member(undefined))).toBeTrue();
  });

  it('keeps the pack when every month already carries its stake', () => {
    expect(memberLacksDailyAmount(member(300))).toBeFalse();
  });
});
