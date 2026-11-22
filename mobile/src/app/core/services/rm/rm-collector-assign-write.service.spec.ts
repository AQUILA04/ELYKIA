import type { Mock, MockedObject } from "vitest";
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
    let coordinator: MockedObject<OnlineFirstWriteCoordinator>;
    let api: MockedObject<RmCollectorAssignApiService>;
    let queue: MockedObject<RmCollectorAssignQueueService>;
    let scope: {
        getPack: Mock;
        setPack: Mock;
    };

    const pack: RmOfflinePack = {
        planId: 1,
        planDate: '2026-08-19',
        generatedAt: '2026-08-19T10:00:00Z',
        stats: { lateCredits: 1, clients: 1, estimatedBytes: 1000 },
        commercials: [{ username: 'COM020', displayName: 'COM020' }],
        lateCredits: [{ id: 9, clientId: 11, collector: 'COM020' }],
        inProgressCredits: [{ id: 8, clientId: 11, collector: 'COM020' }],
        clients: [{ id: 11, collector: 'COM020', tontineCollector: 'COM020' }],
        creditFieldControlsToday: [],
        tontineMembers: [{ id: 4, clientId: 11, tontineCollector: 'COM020', months: [] }],
        tontineFieldControlsToday: []
    };

    beforeEach(() => {
        coordinator = {
            executeWrite: vi.fn().mockName("OnlineFirstWriteCoordinator.executeWrite")
        } as unknown as MockedObject<OnlineFirstWriteCoordinator>;
        api = {
            bulkAssign: vi.fn().mockName("RmCollectorAssignApiService.bulkAssign")
        } as unknown as MockedObject<RmCollectorAssignApiService>;
        queue = {
            upsert: vi.fn().mockName("RmCollectorAssignQueueService.upsert")
        } as unknown as MockedObject<RmCollectorAssignQueueService>;
        queue.upsert.mockResolvedValue(undefined);
        scope = {
            getPack: vi.fn().mockReturnValue(pack),
            setPack: vi.fn().mockResolvedValue(undefined)
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
        await expect(service.assign({ clientIds: [11] })).rejects.toThrowError(/au moins un commercial/);
        expect(coordinator.executeWrite).not.toHaveBeenCalled();
    });

    it('rejects when the selected collectors are unchanged', async () => {
        await expect(service.assign({
            clientIds: [11],
            collector: 'COM020'
        })).rejects.toThrowError(/déjà assignés/);
    });

    it('saves online, queues a synced op and mutates the pack', async () => {
        api.bulkAssign.mockResolvedValue(true);
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOnline(),
            mode: 'online' as const
        }));

        const result = await service.assign({
            clientIds: [11],
            collector: 'COM021',
            transferInProgressCredits: true
        });

        expect(result.mode).toBe('online');
        expect(result.op.isSync).toBe(true);
        expect(api.bulkAssign).toHaveBeenCalled();
        expect(queue.upsert).toHaveBeenCalled();
        expect(scope.setPack).toHaveBeenCalled();
        const next = vi.mocked(scope.setPack).mock.lastCall![0] as RmOfflinePack;
        expect(next.clients[0].collector).toBe('COM021');
        expect(next.lateCredits[0].collector).toBe('COM021');
        expect(next.inProgressCredits?.[0].collector).toBe('COM021');
    });

    it('falls back offline without calling the API when coordinator uses saveOffline', async () => {
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOffline(),
            mode: 'offline' as const
        }));

        const result = await service.assign({
            clientIds: [11],
            tontineCollector: 'COM021'
        });

        expect(result.mode).toBe('offline');
        expect(result.op.isSync).toBe(false);
        expect(api.bulkAssign).not.toHaveBeenCalled();
        expect(queue.upsert).toHaveBeenCalled();
        const next = vi.mocked(scope.setPack).mock.lastCall![0] as RmOfflinePack;
        expect(next.tontineMembers[0].tontineCollector).toBe('COM021');
        expect(next.lateCredits[0].collector).toBe('COM020');
        expect(next.inProgressCredits?.[0].collector).toBe('COM020');
    });

    it('does not queue when a 4xx business error is thrown from saveOnline', async () => {
        api.bulkAssign.mockRejectedValue(new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }));
        coordinator.executeWrite.mockImplementation(async (options) => {
            try {
                await options.saveOnline();
            }
            catch {
                throw new OnlineWriteError(WriteErrorKind.BUSINESS, 'interdit');
            }
            return { data: null as never, mode: 'online' as const };
        });

        await expect(service.assign({
            clientIds: [11],
            collector: 'COM021'
        })).rejects.toThrow();
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
        expect(next.inProgressCredits?.[0].collector).toBe('COM020');
    });
});
