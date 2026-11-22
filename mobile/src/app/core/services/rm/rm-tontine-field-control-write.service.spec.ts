import type { Mock, MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth.service';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { ParameterService } from '../parameter.service';
import { RmOfflinePack } from './rm.models';
import { RmScopeService } from './rm-scope.service';
import { RmTontineFieldControlApiService } from './rm-tontine-field-control-api.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { RmTontineFieldControlWriteService } from './rm-tontine-field-control-write.service';
import { TONTINE_AUTO_VERIFY_ON_FIELD_CONTROL } from './rm-tontine-field-control.models';

describe('RmTontineFieldControlWriteService', () => {
    let service: RmTontineFieldControlWriteService;
    let coordinator: MockedObject<OnlineFirstWriteCoordinator>;
    let api: MockedObject<RmTontineFieldControlApiService>;
    let queue: MockedObject<RmTontineFieldControlQueueService>;
    let parameters: MockedObject<ParameterService>;
    let stored: RmOfflinePack;
    let scope: {
        getPack: Mock;
        setPack: Mock;
    };

    function basePack(autoVerify?: boolean): RmOfflinePack {
        return {
            planId: 1,
            planDate: '2026-10-29',
            generatedAt: '2026-10-29T08:00:00Z',
            stats: { lateCredits: 0, clients: 1, tontineMembers: 1, estimatedBytes: 1000 },
            commercials: [],
            lateCredits: [],
            clients: [],
            creditFieldControlsToday: [],
            tontineMembers: [{ id: 4, clientName: 'Afi', months: [], carnetVerified: false }],
            tontineFieldControlsToday: [],
            tontineAutoVerifyOnFieldControl: autoVerify
        };
    }

    beforeEach(() => {
        stored = basePack(false);
        coordinator = {
            executeWrite: vi.fn().mockName("OnlineFirstWriteCoordinator.executeWrite")
        } as unknown as MockedObject<OnlineFirstWriteCoordinator>;
        api = {
            create: vi.fn().mockName("RmTontineFieldControlApiService.create")
        } as unknown as MockedObject<RmTontineFieldControlApiService>;
        queue = {
            upsert: vi.fn().mockName("RmTontineFieldControlQueueService.upsert")
        } as unknown as MockedObject<RmTontineFieldControlQueueService>;
        queue.upsert.mockResolvedValue(undefined);
        parameters = {
            isEnabled: vi.fn().mockName("ParameterService.isEnabled")
        } as unknown as MockedObject<ParameterService>;
        parameters.isEnabled.mockResolvedValue(false);
        scope = {
            getPack: vi.fn().mockImplementation(() => stored),
            setPack: vi.fn().mockImplementation(async (next: RmOfflinePack) => {
                stored = next;
            })
        };

        TestBed.configureTestingModule({
            providers: [
                RmTontineFieldControlWriteService,
                { provide: OnlineFirstWriteCoordinator, useValue: coordinator },
                { provide: RmTontineFieldControlApiService, useValue: api },
                { provide: RmTontineFieldControlQueueService, useValue: queue },
                { provide: RmScopeService, useValue: scope },
                { provide: AuthService, useValue: { currentUser: { username: 'rm1' } } },
                { provide: ParameterService, useValue: parameters }
            ]
        });
        service = TestBed.inject(RmTontineFieldControlWriteService);
    });

    function request() {
        return {
            tontineMemberId: 4,
            clientName: 'Afi',
            months: [{ year: 2026, month: 2, commercialUsername: 'COM1', notebookAmount: 1000, systemAmount: 1000 }]
        };
    }

    it('keeps the carnet unverified offline when auto-verify is off', async () => {
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOffline(),
            mode: 'offline' as const
        }));

        const result = await service.create(request());

        expect(result.op.carnetVerified).toBe(false);
        expect(stored.tontineMembers[0].carnetVerified).toBe(false);
        expect(parameters.isEnabled).not.toHaveBeenCalled();
    });

    it('marks the carnet verified offline when the pack flag is on', async () => {
        stored = basePack(true);
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOffline(),
            mode: 'offline' as const
        }));

        const result = await service.create(request());

        expect(result.op.carnetVerified).toBe(true);
        expect(result.op.carnetVerifiedBy).toBe('rm1');
        expect(stored.tontineMembers[0].carnetVerified).toBe(true);
        expect(stored.tontineMembers[0].carnetVerifiedBy).toBe('rm1');
        expect(stored.tontineFieldControlsToday.length).toBe(1);
    });

    it('falls back to the local parameter when the pack has no flag', async () => {
        stored = basePack(undefined);
        parameters.isEnabled.mockResolvedValue(true);
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOffline(),
            mode: 'offline' as const
        }));

        const result = await service.create(request());

        expect(parameters.isEnabled).toHaveBeenCalledWith(TONTINE_AUTO_VERIFY_ON_FIELD_CONTROL);
        expect(result.op.carnetVerified).toBe(true);
        expect(stored.tontineMembers[0].carnetVerified).toBe(true);
    });

    it('applies the server verification when the control is saved online', async () => {
        api.create.mockResolvedValue({
            tontineMemberId: 4,
            reference: 'TFC',
            notebookTotalAmount: 1000,
            systemTotalAmount: 1000,
            differenceAmount: 0,
            status: 'CONFORME',
            carnetVerified: true,
            carnetVerifiedAt: '2026-10-29T10:00:00',
            carnetVerifiedBy: 'rm1'
        });
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOnline(),
            mode: 'online' as const
        }));

        const result = await service.create(request());

        expect(result.mode).toBe('online');
        expect(result.op.carnetVerified).toBe(true);
        expect(stored.tontineMembers[0].carnetVerified).toBe(true);
        expect(stored.tontineMembers[0].carnetVerifiedBy).toBe('rm1');
    });
});
