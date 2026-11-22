import {
  collectionEquivalentDays,
  getApplicableAmountForDate
} from './tontine-amount-history.util';
import { TontineMemberAmountHistory } from '../types/tontine.types';

describe('tontine-amount-history.util', () => {
  const history: TontineMemberAmountHistory[] = [
    { id: 1, amount: 100, startDate: '2026-02-01', endDate: '2026-02-28' },
    { id: 2, amount: 200, startDate: '2026-03-01', endDate: null }
  ];

  it('returns historical amount for a past collection date', () => {
    expect(getApplicableAmountForDate(history, '2026-02-15', 200)).toBe(100);
  });

  it('returns current amount for a date after history change', () => {
    expect(getApplicableAmountForDate(history, '2026-03-10', 200)).toBe(200);
  });

  it('computes equivalent days per collection using applicable amount', () => {
    expect(collectionEquivalentDays(100, '2026-02-10', history, 200)).toBe(1);
    expect(collectionEquivalentDays(2000, '2026-02-10', history, 200)).toBe(20);
    expect(collectionEquivalentDays(500, '2026-03-10', history, 200)).toBe(2);
  });

  it('falls back to member amount when history is empty', () => {
    expect(collectionEquivalentDays(1000, '2026-02-10', [], 200)).toBe(5);
  });
});
