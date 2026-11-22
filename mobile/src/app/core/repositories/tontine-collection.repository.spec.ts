import type { MockedObject } from "vitest";
import { TontineCollectionRepository } from './tontine-collection.repository';
import { DatabaseService } from '../services/database.service';
import { TontineCollection } from '../../models/tontine.model';

describe('TontineCollectionRepository V2 fields', () => {
    let repository: TontineCollectionRepository;
    let databaseService: MockedObject<DatabaseService>;

    beforeEach(() => {
        databaseService = {
            executeSet: vi.fn().mockName("DatabaseService.executeSet"),
            query: vi.fn().mockName("DatabaseService.query"),
            execute: vi.fn().mockName("DatabaseService.execute")
        } as unknown as MockedObject<DatabaseService>;
        (databaseService as any).db = {};
        databaseService.executeSet.mockResolvedValue(undefined);
        repository = new TontineCollectionRepository(databaseService);
    });

    it('persists contributionMonth, advanceToNextMonth and societyShareAmount', async () => {
        const collection: TontineCollection = {
            id: 'local-1',
            tontineMemberId: 'm1',
            amount: 5000,
            collectionDate: '2026-03-15T10:00:00',
            commercialUsername: 'COM002',
            isLocal: true,
            isSync: false,
            societyShareAmount: 1000,
            contributionMonth: '2026-03-01',
            advanceToNextMonth: false
        };

        await repository.saveAll([collection], false);

        const set = vi.mocked(databaseService.executeSet).mock.lastCall![0][0];
        const values: unknown[] = set.values ?? [];
        expect(values).toContain('2026-03-01');
        expect(values).toContain(1000);
        expect(values[values.length - 1]).toBe(0);
    });

    it('maps sqlite booleans when reading by member', async () => {
        databaseService.query.mockResolvedValue({
            values: [{
                    id: '1',
                    tontineMemberId: 'm1',
                    amount: 5000,
                    collectionDate: '2026-03-15',
                    isLocal: 1,
                    isSync: 0,
                    isDeliveryCollection: 0,
                    advanceToNextMonth: 0,
                    societyShareAmount: 0,
                    contributionMonth: '2026-03-01'
                }]
        });

        const rows = await repository.getByMemberId('m1');

        expect(rows[0].isLocal).toBe(true);
        expect(rows[0].isSync).toBe(false);
        expect(rows[0].contributionMonth).toBe('2026-03-01');
        expect(rows[0].advanceToNextMonth).toBe(false);
    });

    it('lists unsynced local collection ids', async () => {
        databaseService.query.mockResolvedValue({ values: [{ id: 'uuid-local' }, { id: 'uuid-2' }] });

        const ids = await repository.getUnsyncedLocalIds();

        expect(ids.has('uuid-local')).toBe(true);
        expect(ids.size).toBe(2);
    });

    it('markAsSynced rewrites the primary key in place (no second INSERT)', async () => {
        databaseService.execute.mockResolvedValue(undefined);

        await repository.markAsSynced('uuid-local', '31979');

        expect(databaseService.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE tontine_collections SET isSync = 1, isLocal = 0, id = \?/), ['31979', 'uuid-local']);
    });

    it('purgeSyncedOrphans deletes Local UUID rows that already have a Sync server twin', async () => {
        databaseService.query.mockResolvedValue({
            values: [{ localId: 'uuid-orphan-1' }, { localId: 'uuid-orphan-2' }]
        });
        databaseService.execute.mockResolvedValue(undefined);

        const purged = await repository.purgeSyncedOrphans();

        expect(purged).toBe(2);
        expect(databaseService.execute).toHaveBeenCalledTimes(2);
        expect(vi.mocked(databaseService.execute).mock.calls[0]).toEqual([
            expect.stringMatching(/DELETE FROM tontine_collections WHERE id = \? AND isLocal = 1 AND isSync = 0/),
            ['uuid-orphan-1']
        ]);
        expect(vi.mocked(databaseService.execute).mock.calls[1][1]).toEqual(['uuid-orphan-2']);
    });

    it('purgeSyncedOrphans is a no-op when there are no orphan twins', async () => {
        databaseService.query.mockResolvedValue({ values: [] });

        const purged = await repository.purgeSyncedOrphans();

        expect(purged).toBe(0);
        expect(databaseService.execute).not.toHaveBeenCalled();
    });
});
