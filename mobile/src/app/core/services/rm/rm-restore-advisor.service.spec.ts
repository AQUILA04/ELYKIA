import { RmRestoreAdvisorService } from './rm-restore-advisor.service';

const unsynced = `INSERT INTO rm_offline_ops (queue_key, local_id, payload, is_sync) VALUES ('q', 'a', '{"isSync":false}', 0);`;

function build(hasPending: boolean, files: Record<string, string | null>) {
  const database = {
    listBackupFiles: jasmine.createSpy('listBackupFiles').and.resolveTo(Object.keys(files)),
    readBackupFile: jasmine.createSpy('readBackupFile').and.callFake(async (path: string) => files[path]),
  };
  const pending = { hasPending: jasmine.createSpy('hasPending').and.resolveTo(hasPending) };
  const service = new RmRestoreAdvisorService(
    database as any, pending as any, {} as any, {} as any, {} as any, {} as any, { log: () => Promise.resolve() } as any
  );
  return { service, database };
}

describe('RmRestoreAdvisorService.findRecoverableBackup', () => {
  it('proposes the most recent backup that still holds unsynchronized entries', async () => {
    const { service } = build(false, { 'elykia/db-backup-3.sql': 'DELETE FROM clients;', 'elykia/db-backup-2.sql': unsynced });
    expect(await service.findRecoverableBackup()).toEqual({ path: 'elykia/db-backup-2.sql', unsyncedCount: 1 });
  });

  it('proposes nothing while entries are already waiting in the app', async () => {
    const { service, database } = build(true, { 'elykia/db-backup-1.sql': unsynced });
    expect(await service.findRecoverableBackup()).toBeNull();
    expect(database.listBackupFiles).not.toHaveBeenCalled();
  });

  it('proposes nothing when no backup holds entries or backups are unreadable', async () => {
    const { service } = build(false, { 'elykia/db-backup-1.sql': null, 'elykia/db-backup-0.sql': '' });
    expect(await service.findRecoverableBackup()).toBeNull();
  });
});
