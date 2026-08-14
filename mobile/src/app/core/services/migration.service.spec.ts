import { MigrationService } from './migration.service';
import { LoggerService } from './logger.service';

describe('MigrationService v30', () => {
  it('adds V2 columns and backfills contributionMonth, advanceToNextMonth and societyShareAmount', async () => {
    const executes: string[] = [];
    const db = {
      query: async () => ({ values: [] }),
      execute: async (sql: string) => {
        executes.push(sql);
      }
    } as any;

    const service = new MigrationService({ log: () => undefined } as unknown as LoggerService);
    await service.runMigrations(db, 29, 30);

    expect(executes.some(sql => sql.includes('ALTER TABLE tontine_collections ADD COLUMN contributionMonth'))).toBeTrue();
    expect(executes.some(sql => sql.includes('ALTER TABLE tontine_collections ADD COLUMN societyShareAmount'))).toBeTrue();
    expect(executes.some(sql => sql.includes('ALTER TABLE tontine_collections ADD COLUMN advanceToNextMonth'))).toBeTrue();
    expect(executes.some(sql => sql.includes("contributionMonth = substr(collectionDate, 1, 7) || '-01'"))).toBeTrue();
    expect(executes.some(sql => sql.includes('advanceToNextMonth = 0'))).toBeTrue();
    expect(executes.some(sql => sql.includes('societyShareAmount = 0'))).toBeTrue();
  });
});
