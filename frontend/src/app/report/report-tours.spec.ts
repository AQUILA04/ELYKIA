import { COCKPIT_TOUR, DEPOSITS_TOUR, JOURNAL_TOUR, REMITTANCE_TOUR, SHEET_TOUR } from './report-tours';

describe('report tours', () => {
    it('ships non-empty tours with unique targets', () => {
        for (const definition of [COCKPIT_TOUR, SHEET_TOUR, DEPOSITS_TOUR, JOURNAL_TOUR, REMITTANCE_TOUR]) {
            expect(definition.steps.length).toBeGreaterThan(0);
            const targets = definition.steps.map(step => step.target).filter(Boolean);
            expect(new Set(targets).size).toBe(targets.length);
        }
    });
});
