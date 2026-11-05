import { syncErrorScopeSql, syncErrorVisibleForScope } from './sync-error-scope';

describe('sync error scope', () => {
  it('montre au chef de recouvrement uniquement ses erreurs', () => {
    expect(syncErrorVisibleForScope('rm-close', 'rm')).toBeTrue();
    expect(syncErrorVisibleForScope('rm-contact', 'rm')).toBeTrue();
    expect(syncErrorVisibleForScope('client', 'rm')).toBeFalse();
    expect(syncErrorVisibleForScope('recovery', 'rm')).toBeFalse();
    expect(syncErrorScopeSql('rm')).toContain("LIKE 'rm-%'");
  });

  it('masque au commercial les erreurs du chef de recouvrement', () => {
    expect(syncErrorVisibleForScope('rm-close', 'commercial')).toBeFalse();
    expect(syncErrorVisibleForScope('client', 'commercial')).toBeTrue();
    expect(syncErrorVisibleForScope('recovery', 'commercial')).toBeTrue();
    expect(syncErrorVisibleForScope(null, 'commercial')).toBeTrue();
    expect(syncErrorScopeSql('commercial')).toContain('NOT LIKE');
  });
});
