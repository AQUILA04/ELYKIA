import { countUnsyncedRmOpsInBackup, planRmOpsReinjection, RmOfflineOpRow } from './rm-restore.util';

const insert = (isSync: boolean) =>
  `INSERT INTO rm_offline_ops (queue_key, local_id, payload, is_sync, sync_error_id, position) VALUES ('rm_close', 'a', '{"localId":"a","isSync":${isSync}}', ${isSync ? 1 : 0}, NULL, 0);`;

describe('countUnsyncedRmOpsInBackup', () => {
  it('counts only unsynchronized operations of the RM table', () => {
    const sql = [
      '-- Table: clients',
      "INSERT INTO clients (id, payload) VALUES (1, '\"isSync\":false');",
      insert(false),
      insert(true),
      insert(false),
    ].join('\n');
    expect(countUnsyncedRmOpsInBackup(sql)).toBe(2);
  });

  it('is zero for an empty or RM-free backup', () => {
    expect(countUnsyncedRmOpsInBackup('')).toBe(0);
    expect(countUnsyncedRmOpsInBackup('DELETE FROM clients;')).toBe(0);
  });
});

describe('planRmOpsReinjection', () => {
  const row = (queue: string, id: string, isSync = 0): RmOfflineOpRow =>
    ({ queue_key: queue, local_id: id, payload: '{}', is_sync: isSync, sync_error_id: null });

  it('keeps unsynchronized rows, once each', () => {
    const plan = planRmOpsReinjection([row('q', 'a'), row('q', 'a'), row('q', 'b'), row('r', 'a')]);
    expect(plan.map(r => `${r.queue_key}/${r.local_id}`)).toEqual(['q/a', 'q/b', 'r/a']);
  });

  it('drops synchronized and malformed rows', () => {
    const plan = planRmOpsReinjection([row('q', 'a', 1), { ...row('q', 'b'), local_id: '' }]);
    expect(plan).toEqual([]);
  });
});
