import { rmSqliteDdl, withRmBackupTables } from './rm-sqlite.tables';

describe('RM sqlite backup tables', () => {
  it('crée les tables des opérations, du plan et du pack', () => {
    const ddl = rmSqliteDdl();
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS rm_offline_ops');
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS rm_scope');
    expect(ddl).toContain('sync_error_id');
  });

  it('ajoute ces tables à la liste sauvegardée', () => {
    expect(withRmBackupTables(['clients', 'sync_logs'])).toEqual([
      'clients',
      'sync_logs',
      'rm_offline_ops',
      'rm_scope'
    ]);
    expect(withRmBackupTables(['rm_offline_ops', 'rm_scope'])).toEqual([
      'rm_offline_ops',
      'rm_scope'
    ]);
  });
});
