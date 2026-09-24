import { AccountRepository } from './account.repository';
import { DatabaseService } from '../services/database.service';
import { Account } from '../../models/account.model';

describe('AccountRepository saveAll clientId merge', () => {
  let repository: AccountRepository;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    databaseService = jasmine.createSpyObj('DatabaseService', ['execute', 'executeSet', 'query']);
    (databaseService as any)['db'] = {};
    databaseService.execute.and.resolveTo(undefined as any);
    databaseService.executeSet.and.resolveTo(undefined as any);
    databaseService.query.and.callFake(async (sql: string) => {
      if (sql.includes('SELECT id, syncHash FROM accounts')) {
        return { values: [{ id: 'uuid-acc', syncHash: 'h1' }] } as any;
      }
      if (sql.includes('SELECT * FROM accounts WHERE clientId')) {
        return {
          values: [{
            id: 'uuid-acc',
            accountNumber: 'A1',
            accountBalance: 0,
            status: 'ACTIVE',
            clientId: 'c1',
            isLocal: 1,
            isSync: 0
          }]
        } as any;
      }
      return { values: [] } as any;
    });

    repository = new AccountRepository(databaseService);
  });

  it('merges unsynced local account into incoming server id instead of inserting a twin', async () => {
    spyOn(repository, 'markAsSynced').and.callFake(async (localId: string, serverId: string) => {
      expect(localId).toBe('uuid-acc');
      expect(serverId).toBe('99');
    });

    const incoming: Account = {
      id: '99',
      accountNumber: 'A1',
      accountBalance: 100,
      status: 'ACTIVE',
      clientId: 'c1',
      isLocal: false,
      isSync: true,
      createdAt: '2026-09-01T00:00:00.000Z',
      syncDate: '2026-09-01T00:00:00.000Z'
    };

    await repository.saveAll([incoming]);

    expect(repository.markAsSynced).toHaveBeenCalledWith('uuid-acc', '99');
  });
});
