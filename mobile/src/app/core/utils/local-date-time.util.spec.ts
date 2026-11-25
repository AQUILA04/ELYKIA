import { isLocalToday, toLocalDateTimeString } from './local-date-time.util';

describe('local-date-time.util', () => {
    it('formats a date as local time without timezone', () => {
        expect(toLocalDateTimeString(new Date(2026, 7, 20, 9, 5, 3))).toBe('2026-08-20T09:05:03');
    });

    it('returns undefined for missing or invalid values', () => {
        expect(toLocalDateTimeString(undefined)).toBeUndefined();
        expect(toLocalDateTimeString('not a date')).toBeUndefined();
    });

    it('detects a local date equal to today', () => {
        const now = new Date(2026, 7, 20, 18, 0, 0);
        expect(isLocalToday(new Date(2026, 7, 20, 7, 0, 0), now)).toBe(true);
        expect(isLocalToday(new Date(2026, 7, 19, 23, 0, 0), now)).toBe(false);
    });
});
