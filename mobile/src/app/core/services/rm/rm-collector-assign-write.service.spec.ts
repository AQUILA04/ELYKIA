import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { RmCollectorAssignWriteService } from './rm-collector-assign-write.service';
import { RmCollectorAssignApiService } from './rm-collector-assign-api.service';
import { RmCollectorAssignQueueService } from './rm-collector-assign-queue.service';
import { RmScopeService } from './rm-scope.service';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { OnlineWriteError, WriteErrorKind } from '../online-first-write.types';
import { RmCollectorAssignOp } from './rm-collector-assign.models';
import { RmOfflinePack } from './rm.models';

describe('RmCollectorAssignWriteService', () => {
  let service: RmCollectorAssignWriteService;
  let coordinator: jasmine.SpyObj<OnlineFirstWriteCoordinator>;
  let api: jasmine.SpyObj<RmCollectorAssignApiService>;
  let queue: jasmine.SpyObj<RmCollectorAssignQueueService>;
  let scope: { getPack: jasmine.Spy; setPack: jasmine.Spy };

  const pack: RmOfflinePack = {
    planId: 1,
    planDate: '2026-08-19',
    generatedAt: '2026-08-19T10:00:00Z',
    stats: { lateCredits: 1, clients: 1, estimatedBytes: 1000 },
    commercials: [{ username: 'COM020', displayName: 'COM020' }],
    lateCredits: [{ id: 9, clientId: 11, collector: 'COM020' }],
    clients: [{ id: 11, collector: 'COM020', tontineCollector: 'COM020' }],
    creditFieldControlsToday: [],
    tontineMembers: [{ id: 4, clientId: 11, tontineCollector: 'COM020', months: [] }],
    tontineFieldControlsToday: []
  };

  beforeEach(() => {
    coordinator = jasmine.createSpyObj('OnlineFirstWriteCoordinator', ['executeWrite']);
    api = jasmine.createSpyObj('RmCollectorAssignApiService', ['bulkAssign']);
    queue = jasmine.createSpyObj('RmCollectorAssignQueueService', ['upsert']);
    queue.upsert.and.resolveTo();
    scope = {
      getPack: jasmine.createSpy('getPack').and.returnValue(pack),
      setPack: jasmine.createSpy('setPack').and.resolveTo()
    };

    TestBed.configureTestingModule({
      providers: [
        RmCollectorAssignWriteService,
        { provide: OnlineFirstWriteCoordinator, useValue: coordinator },
        { provide: RmCollectorAssignApiService, useValue: api },
        { provide: RmCollectorAssignQueueService, useValue: queue },
        { provide: RmScopeService, useValue: scope }
      ]
    });

    service = TestBed.inject(RmCollectorAssignWriteService);
  });

  it('rejects an empty collector selection', async () => {
    await expectAsync(service.assign({ clientIds: [11] })).toBeRejectedWithError(
      /au moins un commercial/
    );
    expect(coordinator.executeWrite).not.toHaveBeenCalled();
  });

  it('rejects when the selected collectors are unchanged', async () => {
    await expectAsync(service.assign({
      clientIds: [11],
      collector: 'COM020'
    })).toBeRejectedWithError(/déjà assignés/);
  });

  it('saves online, queues a synced op and mutates the pack', async () => {
    api.bulkAssign.and.resolveTo(true);
    coordinator.executeWrite.and.callFake(async options => ({
      data: await options.saveOnline(),
      mode: 'online' as const
    }));

    const result = await service.assign({
      clientIds: [11],
      collector: 'COM021',
      transferInProgressCredits: true
    });

    expect(result.mode).toBe('online');
    expect(result.op.isSync).toBeTrue();
    expect(api.bulkAssign).toHaveBeenCalled();
    expect(queue.upsert).toHaveBeenCalled();
    expect(scope.setPack).toHaveBeenCalled();
    const next = scope.setPack.calls.mostRecent().args[0] as RmOfflinePack;
    expect(next.clients[0].collector).toBe('COM021');
    expect(next.lateCredits[0].collector).toBe('COM021');
  });

  it('falls back offline without calling the API when coordinator uses saveOffline', async () => {
    coordinator.executeWrite.and.callFake(async options => ({
      data: await options.saveOffline(),
      mode: 'offline' as const
    }));

    const result = await service.assign({
      clientIds: [11],
      tontineCollector: 'COM021'
    });

    expect(result.mode).toBe('offline');
    expect(result.op.isSync).toBeFalse();
    expect(api.bulkAssign).not.toHaveBeenCalled();
    expect(queue.upsert).toHaveBeenCalled();
    const next = scope.setPack.calls.mostRecent().args[0] as RmOfflinePack;
    expect(next.tontineMembers[0].tontineCollector).toBe('COM021');
    expect(next.lateCredits[0].collector).toBe('COM020');
  });

  it('does not queue when a 4xx business error is thrown from saveOnline', async () => {
    api.bulkAssign.and.rejectWith(new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }));
    coordinator.executeWrite.and.callFake(async options => {
      try {
        await options.saveOnline();
      } catch {
        throw new OnlineWriteError(WriteErrorKind.BUSINESS, 'interdit');
      }
      return { data: null as never, mode: 'online' as const };
    });

    await expectAsync(service.assign({
      clientIds: [11],
      collector: 'COM021'
    })).toBeRejected();
    expect(queue.upsert).not.toHaveBeenCalled();
  });

  it('mutates only targeted clients and optional in-progress credits', () => {
    const op: RmCollectorAssignOp = {
      localId: 'a1',
      clientIds: [11],
      collector: 'COM099',
      transferInProgressCredits: false,
      createdAt: '2026-08-19T10:00:00Z',
      isSync: false
    };
    const next = service.applyPackMutationSync(pack, op);
    expect(next.clients[0].collector).toBe('COM099');
    expect(next.lateCredits[0].collector).toBe('COM020');
  });
});
