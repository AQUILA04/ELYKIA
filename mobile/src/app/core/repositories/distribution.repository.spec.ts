import type { MockedObject } from "vitest";
import { DistributionRepository } from './distribution.repository';
import { DatabaseService } from '../services/database.service';

describe('DistributionRepository markAsSynced / merge', () => {
    let repository: DistributionRepository;
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

        repository = new DistributionRepository(databaseService);
    });

    it('sets sync flags when localId equals serverId', async () => {
        await repository.markAsSynced('123', '123');

        expect(databaseService.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE distributions SET isSync = 1/), ['123']);
        expect(databaseService.executeSet).not.toHaveBeenCalled();
    });

    it('rewrites recoveries and items FK when localId differs from serverId', async () => {
        await repository.markAsSynced('uuid-1', '99');

        expect(databaseService.executeSet).toHaveBeenCalled();
        const statements = vi.mocked(databaseService.executeSet).mock.lastCall![0] as Array<{
            statement: string;
            values: any[];
        }>;
        expect(statements.some((s) => s.statement.includes('UPDATE recoveries SET distributionId'))).toBe(true);
        expect(statements.some((s) => s.statement.includes('UPDATE distribution_items SET distributionId'))).toBe(true);
        expect(statements.some((s) => s.statement.includes('UPDATE distributions SET isSync = 1') && s.values[0] === '99')).toBe(true);
    });

    it('mergeLocalRowIntoServerId moves recoveries then deletes UUID when server row exists', async () => {
        vi.spyOn(repository, 'findById').mockResolvedValue({ id: '99' } as any);
        vi.spyOn(repository, 'saveIdMapping').mockResolvedValue(undefined);

        await repository.mergeLocalRowIntoServerId('uuid-1', '99');

        const statements = vi.mocked(databaseService.executeSet).mock.lastCall![0] as Array<{
            statement: string;
        }>;
        expect(statements.some((s) => s.statement.includes('UPDATE recoveries'))).toBe(true);
        expect(statements.some((s) => s.statement.includes('DELETE FROM distributions'))).toBe(true);
    });
});
