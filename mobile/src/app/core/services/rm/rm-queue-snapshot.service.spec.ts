import { parseRmQueueSnapshot, RmQueueSnapshotService } from './rm-queue-snapshot.service';

const row = { queue_key: 'q', local_id: 'a', payload: '{}', is_sync: 0, sync_error_id: null };

describe('parseRmQueueSnapshot', () => {
  it('reads a valid snapshot', () => {
    const raw = JSON.stringify({ version: 1, createdAt: 'x', username: 'rm', rows: [row] });
    expect(parseRmQueueSnapshot(raw)?.rows.length).toBe(1);
  });

  it('ignores truncated, foreign or empty content', () => {
    expect(parseRmQueueSnapshot('')).toBeNull();
    expect(parseRmQueueSnapshot('{"version":1,"rows":[')).toBeNull();
    expect(parseRmQueueSnapshot('{"version":2,"rows":[]}')).toBeNull();
    expect(parseRmQueueSnapshot(JSON.stringify({ version: 1, rows: [{ nope: true }] }))).toBeNull();
  });
});

describe('RmQueueSnapshotService.onQueuesChanged', () => {
  function build(profil = 'RECOVERY_MANAGER') {
    const service = new RmQueueSnapshotService(
      {} as any, {} as any, { currentUser: { profil, roles: [] } } as any, { log: () => Promise.resolve() } as any
    );
    const write = spyOn(service, 'write').and.resolveTo();
    const clear = spyOn(service, 'clear').and.resolveTo();
    return { service, write, clear };
  }

  it('writes while entries are waiting', async () => {
    const { service, write } = build();
    await service.onQueuesChanged(2);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('removes the snapshot once everything has been sent in this session', async () => {
    const { service, clear } = build();
    await service.onQueuesChanged(2);
    await service.onQueuesChanged(0);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('keeps the snapshot when the queues are empty from the start (the case to recover)', async () => {
    const { service, clear, write } = build();
    await service.onQueuesChanged(0);
    expect(clear).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it('does nothing for other profiles', async () => {
    const { service, write } = build('PROMOTER');
    await service.onQueuesChanged(3);
    expect(write).not.toHaveBeenCalled();
  });
});
