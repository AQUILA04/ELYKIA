import { RmPendingQueuesService } from './rm-pending-queues.service';

type FakeQueue = { listPending: jasmine.Spy };

function build(counts: number[]): { service: RmPendingQueuesService; queues: FakeQueue[] } {
  const queues: FakeQueue[] = counts.map(count => ({
    listPending: jasmine.createSpy('listPending').and.resolveTo(new Array(count).fill({})),
  }));
  const [close, contact, control, tontine, carnet, credit, assign] = queues as any[];
  return { service: new RmPendingQueuesService(close, contact, control, tontine, carnet, credit, assign), queues };
}

describe('RmPendingQueuesService', () => {
  it('is true as soon as one queue holds an unsynced operation', async () => {
    const { service } = build([0, 0, 0, 1, 0, 0, 0]);
    expect(await service.hasPending()).toBeTrue();
    expect(await service.pendingCount()).toBe(1);
  });

  it('adds up every queue', async () => {
    const { service } = build([1, 2, 3, 4, 5, 6, 7]);
    expect(await service.pendingCount()).toBe(28);
  });

  it('is false when every queue is empty', async () => {
    const { service } = build([0, 0, 0, 0, 0, 0, 0]);
    expect(await service.hasPending()).toBeFalse();
  });

  it('assumes data is pending when a queue cannot be read', async () => {
    const { service, queues } = build([0, 0, 0, 0, 0, 0, 0]);
    queues[2].listPending.and.rejectWith(new Error('sqlite not ready'));
    spyOn(console, 'error');
    expect(await service.hasPending()).toBeTrue();
  });
});
