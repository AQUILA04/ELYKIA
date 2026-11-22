import { classicParams, filtersFromParams, filtersToParams, isSingleDay, parseIsoDate, presetRange } from './report-period';

function params(values: Record<string, string>) {
    return { get: (name: string) => values[name] ?? null };
}

describe('report-period', () => {
    // Jeudi 19 novembre 2026.
    const today = new Date(2026, 10, 19);

    it('computes preset ranges, week starting on Monday', () => {
        expect(presetRange('today', today)).toEqual({ start: '2026-11-19', end: '2026-11-19' });
        expect(presetRange('week', today)).toEqual({ start: '2026-11-16', end: '2026-11-19' });
        expect(presetRange('month', today)).toEqual({ start: '2026-11-01', end: '2026-11-19' });
        // Un dimanche appartient à la semaine commencée le lundi précédent.
        expect(presetRange('week', new Date(2026, 10, 22)).start).toBe('2026-11-16');
    });

    it('reads filters from the URL, defaulting to today', () => {
        expect(filtersFromParams(params({}), today)).toEqual({
            preset: 'today', start: '2026-11-19', end: '2026-11-19', commercial: null
        });
        expect(filtersFromParams(params({ period: 'month', commercial: 'COM005' }), today)).toEqual({
            preset: 'month', start: '2026-11-01', end: '2026-11-19', commercial: 'COM005'
        });
        expect(filtersFromParams(params({ start: '2026-11-02', end: '2026-11-05' }), today).preset).toBe('custom');
    });

    it('rejects invalid or reversed custom dates', () => {
        expect(filtersFromParams(params({ start: '2026-11-08', end: '2026-11-02' }), today).preset).toBe('today');
        expect(filtersFromParams(params({ start: '2026-02-30', end: '2026-03-01' }), today).preset).toBe('today');
        expect(parseIsoDate('19/11/2026')).toBeNull();
    });

    it('round-trips filters through URL params', () => {
        expect(filtersToParams({ preset: 'week', start: 'x', end: 'y', commercial: null }))
            .toEqual({ period: 'week', start: null, end: null, commercial: null });
        expect(filtersToParams({ preset: 'custom', start: '2026-11-02', end: '2026-11-05', commercial: 'COM009' }))
            .toEqual({ period: null, start: '2026-11-02', end: '2026-11-05', commercial: 'COM009' });
    });

    it('builds the deep link of the classic screen', () => {
        expect(classicParams({ preset: 'today', start: '2026-11-19', end: '2026-11-19', commercial: 'COM005' }))
            .toEqual({ startDate: '2026-11-19', endDate: '2026-11-19', collector: 'COM005' });
        expect(classicParams({ preset: 'today', start: '2026-11-19', end: '2026-11-19', commercial: null }))
            .toEqual({ startDate: '2026-11-19', endDate: '2026-11-19' });
        expect(isSingleDay({ preset: 'today', start: '2026-11-19', end: '2026-11-19', commercial: null })).toBe(true);
    });
});
