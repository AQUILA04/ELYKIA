import { TontineCollectionRepository } from './tontine-collection.repository';
import { DatabaseService } from '../services/database.service';
import { TontineCollection } from '../../models/tontine.model';

describe('TontineCollectionRepository V2 fields', () => {
  let repository: TontineCollectionRepository;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    databaseService = jasmine.createSpyObj('DatabaseService', ['executeSet', 'query', 'execute']);
    (databaseService as any).db = {};
    databaseService.executeSet.and.resolveTo();
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

    const set = databaseService.executeSet.calls.mostRecent().args[0][0];
    const values: unknown[] = set.values ?? [];
    expect(values).toContain('2026-03-01');
    expect(values).toContain(1000);
    expect(values[values.length - 1]).toBe(0);
  });

  it('maps sqlite booleans when reading by member', async () => {
    databaseService.query.and.resolveTo({
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

    expect(rows[0].isLocal).toBeTrue();
    expect(rows[0].isSync).toBeFalse();
    expect(rows[0].contributionMonth).toBe('2026-03-01');
    expect(rows[0].advanceToNextMonth).toBeFalse();
  });

  it('lists unsynced local collection ids', async () => {
    databaseService.query.and.resolveTo({ values: [{ id: 'uuid-local' }, { id: 'uuid-2' }] });

    const ids = await repository.getUnsyncedLocalIds();

    expect(ids.has('uuid-local')).toBeTrue();
    expect(ids.size).toBe(2);
  });

  it('markAsSynced rewrites the primary key in place (no second INSERT)', async () => {
    databaseService.execute.and.resolveTo();

    await repository.markAsSynced('uuid-local', '31979');

    expect(databaseService.execute).toHaveBeenCalledWith(
      jasmine.stringMatching(/UPDATE tontine_collections SET isSync = 1, isLocal = 0, id = \?/),
      ['31979', 'uuid-local']
    );
  });

  it('purgeSyncedOrphans deletes Local UUID rows that already have a Sync server twin', async () => {
    databaseService.query.and.resolveTo({
      values: [{ localId: 'uuid-orphan-1' }, { localId: 'uuid-orphan-2' }]
    });
    databaseService.execute.and.resolveTo();

    const purged = await repository.purgeSyncedOrphans();

    expect(purged).toBe(2);
    expect(databaseService.execute).toHaveBeenCalledTimes(2);
    expect(databaseService.execute.calls.argsFor(0)).toEqual([
      jasmine.stringMatching(/DELETE FROM tontine_collections WHERE id = \? AND isLocal = 1 AND isSync = 0/),
      ['uuid-orphan-1']
    ]);
    expect(databaseService.execute.calls.argsFor(1)[1]).toEqual(['uuid-orphan-2']);
  });

  it('purgeSyncedOrphans is a no-op when there are no orphan twins', async () => {
    databaseService.query.and.resolveTo({ values: [] });

    const purged = await repository.purgeSyncedOrphans();

    expect(purged).toBe(0);
    expect(databaseService.execute).not.toHaveBeenCalled();
  });
});
