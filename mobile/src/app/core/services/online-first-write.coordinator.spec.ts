import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { OnlineFirstWriteCoordinator } from './online-first-write.coordinator';
import { ConnectivityService } from './connectivity.service';
import { HybridSyncPreferenceService } from './hybrid-sync-preference.service';
import { LoggerService } from './logger.service';
import { OnlineWriteError, WriteErrorKind } from './online-first-write.types';

describe('OnlineFirstWriteCoordinator', () => {
    let coordinator: OnlineFirstWriteCoordinator;
    let connectivityService: MockedObject<ConnectivityService>;
    let hybridSyncPreferenceService: MockedObject<HybridSyncPreferenceService>;

    beforeEach(() => {
        connectivityService = {
            checkBackendReachable: vi.fn().mockName("ConnectivityService.checkBackendReachable")
        } as unknown as MockedObject<ConnectivityService>;
        hybridSyncPreferenceService = {
            isHybridSyncEnabled: vi.fn().mockName("HybridSyncPreferenceService.isHybridSyncEnabled")
        } as unknown as MockedObject<HybridSyncPreferenceService>;

        TestBed.configureTestingModule({
            providers: [
                OnlineFirstWriteCoordinator,
                { provide: ConnectivityService, useValue: connectivityService },
                { provide: HybridSyncPreferenceService, useValue: hybridSyncPreferenceService },
                { provide: LoggerService, useValue: { log: vi.fn() } }
            ]
        });

        coordinator = TestBed.inject(OnlineFirstWriteCoordinator);
    });

    it('uses online path when backend is reachable', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(true);

        const saveOnline = vi.fn().mockResolvedValue({ id: 'server-1' });
        const saveOffline = vi.fn();

        const result = await coordinator.executeWrite({
            entityLabel: 'client',
            saveOnline,
            saveOffline
        });

        expect(result.mode).toBe('online');
        expect(saveOnline).toHaveBeenCalled();
        expect(saveOffline).not.toHaveBeenCalled();
    });

    it('falls back to offline when backend is unreachable', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(false);

        const saveOnline = vi.fn();
        const saveOffline = vi.fn().mockResolvedValue({ id: 'local-1' });

        const result = await coordinator.executeWrite({
            entityLabel: 'client',
            saveOnline,
            saveOffline
        });

        expect(result.mode).toBe('offline');
        expect(saveOffline).toHaveBeenCalled();
        expect(saveOnline).not.toHaveBeenCalled();
    });

    it('throws business errors without offline fallback', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(true);

        await expect(coordinator.executeWrite({
            entityLabel: 'client',
            saveOnline: async () => {
                throw new OnlineWriteError(WriteErrorKind.BUSINESS, 'Code client déjà utilisé');
            },
            saveOffline: async () => ({ id: 'local' })
        })).rejects.toThrowError('Code client déjà utilisé');
    });

    it('keeps the HTTP status so a 409 duplicate is not saved offline', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(true);
        const saveOffline = vi.fn();

        let caught: unknown;
        try {
            await coordinator.executeWrite({
                entityLabel: 'tontine-delivery',
                saveOnline: async () => {
                    throw new HttpErrorResponse({ status: 409, error: { message: 'Ce membre a déjà été livré' } });
                },
                saveOffline
            });
        }
        catch (error) {
            caught = error;
        }

        expect(caught instanceof OnlineWriteError).toBe(true);
        expect((caught as OnlineWriteError).status).toBe(409);
        expect((caught as OnlineWriteError).isServerConflict).toBe(true);
        expect((caught as OnlineWriteError).message).toBe('Ce membre a déjà été livré');
        expect(saveOffline).not.toHaveBeenCalled();
    });

    it('does not flag an ordinary 400 as a server conflict', () => {
        expect(new OnlineWriteError(WriteErrorKind.BUSINESS, 'x', 400).isServerConflict).toBe(false);
        expect(new OnlineWriteError(WriteErrorKind.BUSINESS, 'x').isServerConflict).toBe(false);
    });
});
