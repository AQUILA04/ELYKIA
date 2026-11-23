import { latestPendingControl, mergeRmFieldControl } from './rm-field-local-control.util';

const local = (observedAt: string, isSync = false, status = 'CONFORME') => ({ status, observedAt, isSync });
const server = (observedAt: string, status = 'ECART') => ({ status, observedAt });

describe('mergeRmFieldControl', () => {
  it('shows the pending local control when the server list does not know it yet', () => {
    const merged = mergeRmFieldControl(local('2026-11-24T08:00:00Z'), null);
    expect(merged.source).toBe('local');
    expect(merged.conflict).toBeFalse();
  });

  it('prefers a local control that is newer than the server one', () => {
    const merged = mergeRmFieldControl(local('2026-11-24T10:00:00Z'), server('2026-11-24T08:00:00Z'));
    expect(merged.source).toBe('local');
    expect(merged.conflict).toBeFalse();
  });

  it('keeps the server control and flags a conflict when it is more recent', () => {
    const merged = mergeRmFieldControl(local('2026-11-24T08:00:00Z'), server('2026-11-24T10:00:00Z'));
    expect(merged.source).toBe('server');
    expect(merged.conflict).toBeTrue();
    expect(merged.local).not.toBeNull();
  });

  it('ignores a local control that is already synchronized', () => {
    const merged = mergeRmFieldControl(local('2026-11-24T10:00:00Z', true), server('2026-11-24T08:00:00Z'));
    expect(merged.source).toBe('server');
    expect(merged.conflict).toBeFalse();
  });

  it('returns nothing when neither side has a control', () => {
    expect(mergeRmFieldControl(null, null).source).toBe('none');
    expect(mergeRmFieldControl(null, { status: null, observedAt: null }).source).toBe('none');
  });
});

describe('latestPendingControl', () => {
  it('picks the most recent unsynchronized operation', () => {
    const ops = [local('2026-11-24T08:00:00Z'), local('2026-11-24T11:00:00Z'), local('2026-11-24T12:00:00Z', true)];
    expect(latestPendingControl(ops)?.observedAt).toBe('2026-11-24T11:00:00Z');
  });

  it('returns null when everything is synchronized', () => {
    expect(latestPendingControl([local('2026-11-24T08:00:00Z', true)])).toBeNull();
  });
});
