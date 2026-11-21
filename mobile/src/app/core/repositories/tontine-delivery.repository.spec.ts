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

describe('TontineDeliveryRepository purgePhantomDeliveries', () => {
  let repository: TontineDeliveryRepository;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    databaseService = jasmine.createSpyObj('DatabaseService', ['execute', 'executeSet', 'query']);
    (databaseService as any)['db'] = {};
    databaseService.execute.and.resolveTo(undefined as any);
    repository = new TontineDeliveryRepository(databaseService);
  });

  it('deletes deliveries saved without id and their items', async () => {
    databaseService.query.and.resolveTo({ values: [{ total: 1588 }] } as any);

    const purged = await repository.purgePhantomDeliveries();

    expect(purged).toBe(1588);
    const [countSql] = databaseService.query.calls.mostRecent().args as [string];
    expect(countSql).toContain(`id IS NULL OR TRIM(id) IN ('', 'null', 'undefined')`);
    expect(databaseService.execute).toHaveBeenCalledWith(
      jasmine.stringMatching(/DELETE FROM tontine_delivery_items WHERE \(tontineDeliveryId IS NULL/)
    );
    expect(databaseService.execute).toHaveBeenCalledWith(
      jasmine.stringMatching(/DELETE FROM tontine_deliveries WHERE \(id IS NULL/)
    );
  });

  it('is a no-op when every delivery has an id', async () => {
    databaseService.query.and.resolveTo({ values: [{ total: 0 }] } as any);

    expect(await repository.purgePhantomDeliveries()).toBe(0);
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

describe('TontineDeliveryRepository reservedQuantitiesByArticle', () => {
  let repository: TontineDeliveryRepository;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    databaseService = jasmine.createSpyObj('DatabaseService', ['execute', 'executeSet', 'query']);
    (databaseService as any)['db'] = {};
    repository = new TontineDeliveryRepository(databaseService);
  });

  it('sums the quantities of the commercial undelivered orders per article', async () => {
    databaseService.query.and.resolveTo({
      values: [{ articleId: 11, quantity: 4 }, { articleId: '12', quantity: '2' }, { articleId: null, quantity: 9 }]
    } as any);

    const reserved = await repository.reservedQuantitiesByArticle('COM005');

    expect(reserved.get('11')).toBe(4);
    expect(reserved.get('12')).toBe(2);
    expect(reserved.size).toBe(2);
    const [sql, params] = databaseService.query.calls.mostRecent().args;
    expect(sql).toMatch(/UPPER\(TRIM\(d\.status\)\) IN \('PENDING', 'VALIDATED'\)/);
    expect(sql).toMatch(/GROUP BY i\.articleId/);
    expect(params).toEqual(['COM005']);
  });
});

describe('TontineDeliveryRepository saveAll', () => {
  it('replaces the items of the order instead of adding them next to the previous ones', async () => {
    const databaseService = jasmine.createSpyObj('DatabaseService', ['execute', 'executeSet', 'query']);
    (databaseService as any)['db'] = {};
    databaseService.executeSet.and.resolveTo(undefined as any);
    const repository = new TontineDeliveryRepository(databaseService);

    await repository.saveAll([{
      id: '5', tontineMemberId: 'm1', commercialUsername: 'COM010', status: 'PENDING', totalAmount: 15800,
      items: [
        { id: '91', tontineDeliveryId: '5', articleId: 'a1', quantity: 4, unitPrice: 3200, totalPrice: 12800 },
        { id: '92', tontineDeliveryId: '5', articleId: 'a2', quantity: 2, unitPrice: 1500, totalPrice: 3000 }
      ]
    } as any]);

    const set = databaseService.executeSet.calls.mostRecent().args[0] as Array<{ statement: string; values: any[] }>;
    const deleteIndex = set.findIndex(entry => /DELETE FROM tontine_delivery_items WHERE tontineDeliveryId = \?/.test(entry.statement));
    const firstItemIndex = set.findIndex(entry => /INSERT OR REPLACE INTO tontine_delivery_items/.test(entry.statement));
    expect(deleteIndex).toBeGreaterThan(-1);
    expect(set[deleteIndex].values).toEqual(['5']);
    expect(deleteIndex).toBeLessThan(firstItemIndex);
  });

  it('keeps the existing items when the order comes without items', async () => {
    const databaseService = jasmine.createSpyObj('DatabaseService', ['execute', 'executeSet', 'query']);
    (databaseService as any)['db'] = {};
    databaseService.executeSet.and.resolveTo(undefined as any);
    const repository = new TontineDeliveryRepository(databaseService);

    await repository.saveAll([{ id: '5', tontineMemberId: 'm1', commercialUsername: 'COM010', status: 'PENDING', items: [] } as any]);

    const set = databaseService.executeSet.calls.mostRecent().args[0] as Array<{ statement: string }>;
    expect(set.some(entry => /DELETE FROM tontine_delivery_items/.test(entry.statement))).toBeFalse();
  });
});
