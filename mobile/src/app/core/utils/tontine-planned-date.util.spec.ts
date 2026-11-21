import { formatPlannedDate, normalizePlannedDate, todayIsoDate } from './tontine-planned-date.util';

describe('tontine-planned-date.util', () => {
  it('formats today as YYYY-MM-DD', () => {
    expect(todayIsoDate(new Date(2026, 11, 5))).toBe('2026-12-05');
  });

  it('keeps only the day of the input and ignores empty or malformed values', () => {
    expect(normalizePlannedDate('2026-12-15')).toBe('2026-12-15');
    expect(normalizePlannedDate('2026-12-15T00:00:00.000Z')).toBe('2026-12-15');
    expect(normalizePlannedDate('')).toBeNull();
    expect(normalizePlannedDate(undefined)).toBeNull();
    expect(normalizePlannedDate('15/12/2026')).toBeNull();
  });

  it('prints the date as DD/MM/YYYY', () => {
    expect(formatPlannedDate('2026-12-15')).toBe('15/12/2026');
    expect(formatPlannedDate(null)).toBe('');
  });
});
