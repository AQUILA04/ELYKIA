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
