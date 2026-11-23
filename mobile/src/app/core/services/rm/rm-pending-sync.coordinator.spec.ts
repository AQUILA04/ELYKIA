import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { RmPendingSyncCoordinator } from './rm-pending-sync.coordinator';

type Result = { synced: number; failed: number; errors: string[] };
const ok = (synced = 0): Result => ({ synced, failed: 0, errors: [] });
const ko = (): Result => ({ synced: 0, failed: 1, errors: ['boom'] });

function build(options: { reachable?: boolean; authenticated?: boolean; profil?: string } = {}) {
  const syncs = Array.from({ length: 7 }, () => ({
    syncPending: jasmine.createSpy('syncPending').and.resolveTo(ok()),
  }));
  let pending = 3;
  const queues = {
    hasPending: jasmine.createSpy('hasPending').and.callFake(async () => pending > 0),
    pendingCount: jasmine.createSpy('pendingCount').and.callFake(async () => pending),
  };
  const kept = new Subject<void>();
  const auth = {
    isAuthenticated: options.authenticated ?? true,
    currentUser: { profil: options.profil ?? 'RECOVERY_MANAGER', roles: [] },
    sessionExpiredKeptData$: kept.asObservable(),
  };
  const connectivity = {
    checkBackendReachable: jasmine.createSpy('checkBackendReachable').and.resolveTo(options.reachable ?? true),
  };
  const coordinator = new RmPendingSyncCoordinator(
    auth as any, connectivity as any, { resume: new Subject() } as any,
    { log: () => Promise.resolve() } as any, queues as any,
    syncs[0] as any, syncs[1] as any, syncs[2] as any, syncs[3] as any, syncs[4] as any, syncs[5] as any, syncs[6] as any
  );
  return { coordinator, syncs, queues, connectivity, kept, setPending: (n: number) => (pending = n) };
}

describe('RmPendingSyncCoordinator', () => {
  it('sends every queue when the backend is reachable', fakeAsync(() => {
    const { coordinator, syncs, setPending } = build();
    syncs[2].syncPending.and.callFake(async () => { setPending(0); return ok(3); });
    let outcome: any;
    coordinator.syncNow('test').then(o => outcome = o);
    flushMicrotasks();

    syncs.forEach(s => expect(s.syncPending).toHaveBeenCalledTimes(1));
    expect(outcome).toEqual({ status: 'done', synced: 3, failed: 0, remaining: 0 });
  }));

  it('does nothing offline and keeps the queue untouched', fakeAsync(() => {
    const { coordinator, syncs } = build({ reachable: false });
    let outcome: any;
    coordinator.syncNow('test').then(o => outcome = o);
    flushMicrotasks();

    syncs.forEach(s => expect(s.syncPending).not.toHaveBeenCalled());
    expect(outcome.status).toBe('offline');
    expect(outcome.remaining).toBe(3);
  }));

  it('ignores users who are not recovery managers', fakeAsync(() => {
    const { coordinator, syncs } = build({ profil: 'PROMOTER' });
    let outcome: any;
    coordinator.syncNow('test').then(o => outcome = o);
    flushMicrotasks();

    expect(outcome.status).toBe('ignored');
    syncs.forEach(s => expect(s.syncPending).not.toHaveBeenCalled());
  }));

  it('does not start a second wave while one is running', fakeAsync(() => {
    const { coordinator, syncs } = build();
    coordinator.syncNow('a');
    coordinator.syncNow('b');
    flushMicrotasks();

    expect(syncs[0].syncPending).toHaveBeenCalledTimes(1);
  }));

  it('isolates a crashing queue from the others', fakeAsync(() => {
    const { coordinator, syncs } = build();
    syncs[1].syncPending.and.rejectWith(new Error('sqlite'));
    let outcome: any;
    coordinator.syncNow('test').then(o => outcome = o);
    flushMicrotasks();

    expect(syncs[6].syncPending).toHaveBeenCalledTimes(1);
    expect(outcome.failed).toBe(1);
    tick(600_000);
  }));

  it('retries with growing delays then stops', fakeAsync(() => {
    const { coordinator, syncs } = build();
    syncs[0].syncPending.and.resolveTo(ko());

    coordinator.request('test');
    flushMicrotasks();
    expect(syncs[0].syncPending).toHaveBeenCalledTimes(1);

    tick(1_000); flushMicrotasks();
    expect(syncs[0].syncPending).toHaveBeenCalledTimes(2);
    tick(5_000); flushMicrotasks();
    expect(syncs[0].syncPending).toHaveBeenCalledTimes(3);
    tick(15_000); flushMicrotasks();
    expect(syncs[0].syncPending).toHaveBeenCalledTimes(4);
    tick(60_000); flushMicrotasks();
    expect(syncs[0].syncPending).toHaveBeenCalledTimes(5);

    tick(600_000); flushMicrotasks();
    expect(syncs[0].syncPending).toHaveBeenCalledTimes(5);
  }));

  it('stops insisting once the session can no longer be renewed', fakeAsync(() => {
    const { coordinator, syncs, kept } = build();
    coordinator.init();
    syncs[0].syncPending.and.resolveTo(ko());
    flushMicrotasks();
    const calls = syncs[0].syncPending.calls.count();

    kept.next();
    tick(120_000); flushMicrotasks();

    expect(syncs[0].syncPending.calls.count()).toBe(calls);
    coordinator.onSessionOpened();
    flushMicrotasks();
    expect(syncs[0].syncPending.calls.count()).toBe(calls + 1);
    tick(600_000);
  }));
});
