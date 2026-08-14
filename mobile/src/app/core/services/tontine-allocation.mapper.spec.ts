import { shouldSkipPulledCollection, toContributionMonth } from './tontine-allocation.mapper';

describe('tontine-allocation.mapper', () => {
  it('backfills contributionMonth from the collection date', () => {
    expect(toContributionMonth(undefined, '2026-03-15T10:00:00')).toBe('2026-03-01');
  });

  it('skips a pulled collection whose reference still exists locally unsynced', () => {
    const unsynced = new Set(['uuid-local']);
    expect(shouldSkipPulledCollection({ id: 99, reference: 'uuid-local' }, unsynced)).toBeTrue();
    expect(shouldSkipPulledCollection({ id: 100, reference: 'other' }, unsynced)).toBeFalse();
  });
});
