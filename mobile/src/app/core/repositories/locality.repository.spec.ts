import { LocalityRepository } from './locality.repository';
import { DatabaseService } from '../services/database.service';

describe('LocalityRepository markAsSynced', () => {
  let repository: LocalityRepository;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    databaseService = jasmine.createSpyObj('DatabaseService', ['execute', 'executeSet', 'query']);
    (databaseService as any)['db'] = {};
    databaseService.execute.and.resolveTo(undefined as any);
    databaseService.executeSet.and.resolveTo(undefined as any);
    databaseService.query.and.resolveTo({ values: [] } as any);

    repository = new LocalityRepository(databaseService);
  });

  it('rewrites primary key when localId differs from serverId', async () => {
    spyOn(repository, 'findById').and.resolveTo(null);

    await repository.markAsSynced('uuid-loc', '55');

    expect(databaseService.execute).toHaveBeenCalledWith(
      jasmine.stringMatching(/UPDATE localities SET isSync = 1, isLocal = 0, id = \?/),
      ['55', jasmine.any(String), 'uuid-loc']
    );
  });

  it('sets flags only when ids are equal', async () => {
    await repository.markAsSynced('55', '55');

    expect(databaseService.execute).toHaveBeenCalledWith(
      jasmine.stringMatching(/UPDATE localities SET isSync = 1, isLocal = 0, syncDate = \? WHERE id = \?/),
      [jasmine.any(String), '55']
    );
  });
});
