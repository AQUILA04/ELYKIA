import type { MockedObject } from "vitest";
import { LocalityRepository } from './locality.repository';
import { DatabaseService } from '../services/database.service';

describe('LocalityRepository markAsSynced', () => {
    let repository: LocalityRepository;
    let databaseService: MockedObject<DatabaseService>;

    beforeEach(() => {
        databaseService = {
            execute: vi.fn().mockName("DatabaseService.execute"),
            executeSet: vi.fn().mockName("DatabaseService.executeSet"),
            query: vi.fn().mockName("DatabaseService.query")
        } as unknown as MockedObject<DatabaseService>;
        (databaseService as any)['db'] = {};
        databaseService.execute.mockResolvedValue(undefined as any);
        databaseService.executeSet.mockResolvedValue(undefined as any);
        databaseService.query.mockResolvedValue({ values: [] } as any);

        repository = new LocalityRepository(databaseService);
    });

    it('rewrites primary key when localId differs from serverId', async () => {
        vi.spyOn(repository, 'findById').mockResolvedValue(null);

        await repository.markAsSynced('uuid-loc', '55');

        expect(databaseService.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE localities SET isSync = 1, isLocal = 0, id = \?/), ['55', expect.any(String), 'uuid-loc']);
    });

    it('sets flags only when ids are equal', async () => {
        await repository.markAsSynced('55', '55');

        expect(databaseService.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE localities SET isSync = 1, isLocal = 0, syncDate = \? WHERE id = \?/), [expect.any(String), '55']);
    });
});
