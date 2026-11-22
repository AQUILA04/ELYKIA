import type { Mock } from "vitest";
import { RmLocalStore } from './rm-local-store.service';
import { resetRmDataRestoredListeners } from './rm-data-restored';

describe('RmLocalStore', () => {
    const storageData = new Map<string, unknown>();

    function row(payload: string): {
        payload: string;
    } {
        return { payload };
    }

    function create(db: {
        query: Mock;
        execute: Mock;
        executeSet: Mock;
    }): RmLocalStore {
        const storage = {
            create: () => Promise.resolve(),
            get: (key: string) => Promise.resolve(storageData.get(key) ?? null),
            remove: (key: string) => {
                storageData.delete(key);
                return Promise.resolve();
            }
        };
        return new RmLocalStore({
            initializeDatabaseOnce: () => Promise.resolve(),
            query: db.query,
            execute: db.execute,
            executeSet: db.executeSet
        } as any, storage as any);
    }

    beforeEach(() => {
        storageData.clear();
        resetRmDataRestoredListeners();
    });

    afterEach(() => {
        resetRmDataRestoredListeners();
    });

    it('recopie une file Ionic Storage vide en base puis retire la clé', async () => {
        storageData.set('rm_close_ops', [{ localId: 'a', isSync: false, syncErrorId: 'err-1' }]);
        let saved: Array<{
            localId: string;
        }> = [];
        const execute = vi.fn().mockResolvedValue(undefined);
        const executeSet = vi.fn().mockImplementation((statements: Array<{
            values: unknown[];
        }>) => {
            saved = statements.map(statement => JSON.parse(String(statement.values[2])));
            return Promise.resolve();
        });
        const query = vi.fn().mockImplementation((sql: string) => {
            if (sql.includes('COUNT')) {
                return Promise.resolve({ values: [{ count: 0 }] });
            }
            return Promise.resolve({ values: saved.map(op => ({ payload: JSON.stringify(op) })) });
        });
        const store = create({ query, execute, executeSet });

        const ops = await store.loadOps<{
            localId: string;
        }>('rm_close_ops');

        expect(executeSet).toHaveBeenCalled();
        const inserted = vi.mocked(executeSet).mock.lastCall![0][0];
        expect(inserted.statement).toContain('INSERT INTO rm_offline_ops');
        expect(inserted.values[1]).toBe('a');
        expect(inserted.values[4]).toBe('err-1');
        expect(storageData.has('rm_close_ops')).toBe(false);
        expect(ops[0].localId).toBe('a');
    });

    it('lit le pack SQLite sans repasser par Ionic Storage', async () => {
        storageData.set('rm_offline_pack', { stale: true });
        const query = vi.fn().mockResolvedValue({
            values: [row(JSON.stringify({ planId: 4 }))]
        });
        const store = create({
            query,
            execute: vi.fn().mockResolvedValue(undefined),
            executeSet: vi.fn().mockResolvedValue(undefined)
        });

        const payload = await store.loadScope('rm_offline_pack');

        expect(payload).toContain('"planId":4');
        expect(storageData.has('rm_offline_pack')).toBe(true);
    });
});
