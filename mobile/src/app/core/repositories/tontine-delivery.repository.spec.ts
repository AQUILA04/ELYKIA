import { TontineDeliveryRepository } from './tontine-delivery.repository';
import { DatabaseService } from '../services/database.service';

describe('TontineDeliveryRepository purgeSyncedOrphans', () => {
  let repository: TontineDeliveryRepository;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    databaseService = jasmine.createSpyObj('DatabaseService', ['execute', 'executeSet', 'query']);
    (databaseService as any)['db'] = {};
    databaseService.execute.and.resolveTo(undefined as any);
    databaseService.query.and.resolveTo({ values: [{ localId: 'uuid-d1' }] } as any);

    repository = new TontineDeliveryRepository(databaseService);
  });

  it('deletes UUID orphan deliveries that already have a server twin', async () => {
    const purged = await repository.purgeSyncedOrphans();

    expect(purged).toBe(1);
    expect(databaseService.execute).toHaveBeenCalledWith(
      jasmine.stringMatching(/DELETE FROM tontine_delivery_items/),
      ['uuid-d1']
    );
    expect(databaseService.execute).toHaveBeenCalledWith(
      jasmine.stringMatching(/DELETE FROM tontine_deliveries WHERE id = \?/),
      ['uuid-d1']
    );
  });

  it('is a no-op when there are no orphan twins', async () => {
    databaseService.query.and.resolveTo({ values: [] } as any);

    const purged = await repository.purgeSyncedOrphans();

    expect(purged).toBe(0);
    expect(databaseService.execute).not.toHaveBeenCalled();
  });
});

describe('TontineDeliveryRepository findUnsynced', () => {
  let repository: TontineDeliveryRepository;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    databaseService = jasmine.createSpyObj('DatabaseService', ['execute', 'executeSet', 'query']);
    (databaseService as any)['db'] = {};
    databaseService.query.and.resolveTo({ values: [] } as any);
    repository = new TontineDeliveryRepository(databaseService);
  });

  it('keeps the unsynced query unchanged when no date filter is provided', async () => {
    await repository.findUnsynced('COM002', 50, 0);

    const [sql, params] = databaseService.query.calls.mostRecent().args;
    expect(sql).not.toContain('deliveryDate');
    expect(sql).not.toContain('requestDate');
    expect(sql).toContain('LIMIT ? OFFSET ?');
    expect(params).toEqual(['COM002', 50, 0]);
  });

  it('applies the sync date window in SQL before LIMIT', async () => {
    await repository.findUnsynced('COM002', 50, 0, {
      startDate: '2026-10-01',
      endDate: '2026-10-22'
    });

    const [sql, params] = databaseService.query.calls.mostRecent().args as [string, unknown[]];
    const dateExpr = `substr(COALESCE(NULLIF(deliveryDate, ''), requestDate), 1, 10)`;
    expect(sql).toContain(dateExpr);
    expect(sql).toContain(`COALESCE(NULLIF(deliveryDate, ''), NULLIF(requestDate, '')) IS NULL`);
    expect(sql.indexOf('LIMIT ? OFFSET ?')).toBeGreaterThan(sql.indexOf(dateExpr));
    expect(params).toEqual(['COM002', '2026-10-01', '2026-10-22', 50, 0]);
  });

  it('omits a missing bound from the date clause', async () => {
    await repository.findUnsynced('COM002', 20, 5, { startDate: '2026-10-01' });

    const [sql, params] = databaseService.query.calls.mostRecent().args as [string, unknown[]];
    expect(sql).toContain(`substr(COALESCE(NULLIF(deliveryDate, ''), requestDate), 1, 10) >= ?`);
    expect(sql).not.toContain('<= ?');
    expect(params).toEqual(['COM002', '2026-10-01', 20, 5]);
  });
});
