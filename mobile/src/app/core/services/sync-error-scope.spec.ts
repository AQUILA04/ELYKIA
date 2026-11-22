import { syncErrorScopeSql, syncErrorVisibleForScope } from './sync-error-scope';

describe('sync error scope', () => {
    it('montre au chef de recouvrement uniquement ses erreurs', () => {
        expect(syncErrorVisibleForScope('rm-close', 'rm')).toBe(true);
        expect(syncErrorVisibleForScope('rm-contact', 'rm')).toBe(true);
        expect(syncErrorVisibleForScope('client', 'rm')).toBe(false);
        expect(syncErrorVisibleForScope('recovery', 'rm')).toBe(false);
        expect(syncErrorScopeSql('rm')).toContain("LIKE 'rm-%'");
    });

    it('masque au commercial les erreurs du chef de recouvrement', () => {
        expect(syncErrorVisibleForScope('rm-close', 'commercial')).toBe(false);
        expect(syncErrorVisibleForScope('client', 'commercial')).toBe(true);
        expect(syncErrorVisibleForScope('recovery', 'commercial')).toBe(true);
        expect(syncErrorVisibleForScope(null, 'commercial')).toBe(true);
        expect(syncErrorScopeSql('commercial')).toContain('NOT LIKE');
    });
});
