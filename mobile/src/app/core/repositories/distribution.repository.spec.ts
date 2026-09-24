import { DistributionRepository } from './distribution.repository';
import { DatabaseService } from '../services/database.service';

describe('DistributionRepository markAsSynced / merge', () => {
  let repository: DistributionRepository;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    databaseService = jasmine.createSpyObj('DatabaseService', ['execute', 'executeSet', 'query']);
    (databaseService as any)['db'] = {};
    databaseService.execute.and.resolveTo(undefined as any);
    databaseService.executeSet.and.resolveTo(undefined as any);
    databaseService.query.and.resolveTo({ values: [] } as any);

    repository = new DistributionRepository(databaseService);
  });

  it('sets sync flags when localId equals serverId', async () => {
    await repository.markAsSynced('123', '123');

    expect(databaseService.execute).toHaveBeenCalledWith(
      jasmine.stringMatching(/UPDATE distributions SET isSync = 1/),
      ['123']
    );
    expect(databaseService.executeSet).not.toHaveBeenCalled();
  });

  it('rewrites recoveries and items FK when localId differs from serverId', async () => {
    await repository.markAsSynced('uuid-1', '99');

    expect(databaseService.executeSet).toHaveBeenCalled();
    const statements = databaseService.executeSet.calls.mostRecent().args[0] as Array<{ statement: string; values: any[] }>;
    expect(statements.some((s) => s.statement.includes('UPDATE recoveries SET distributionId'))).toBeTrue();
    expect(statements.some((s) => s.statement.includes('UPDATE distribution_items SET distributionId'))).toBeTrue();
    expect(statements.some((s) => s.statement.includes('UPDATE distributions SET isSync = 1') && s.values[0] === '99')).toBeTrue();
  });

  it('mergeLocalRowIntoServerId moves recoveries then deletes UUID when server row exists', async () => {
    spyOn(repository, 'findById').and.resolveTo({ id: '99' } as any);
    spyOn(repository, 'saveIdMapping').and.resolveTo();

    await repository.mergeLocalRowIntoServerId('uuid-1', '99');

    const statements = databaseService.executeSet.calls.mostRecent().args[0] as Array<{ statement: string }>;
    expect(statements.some((s) => s.statement.includes('UPDATE recoveries'))).toBeTrue();
    expect(statements.some((s) => s.statement.includes('DELETE FROM distributions'))).toBeTrue();
  });
});
