import type { MockedObject } from "vitest";
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { Platform } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { AutoSyncSchedulerService } from './auto-sync-scheduler.service';
import { ConnectivityService } from './connectivity.service';
import { HybridSyncPreferenceService } from './hybrid-sync-preference.service';
import { LoggerService } from './logger.service';
import * as SyncActions from '../../store/sync/sync.actions';

describe('AutoSyncSchedulerService', () => {
    let service: AutoSyncSchedulerService;
    let store: MockedObject<Store>;
    let connectivityService: MockedObject<ConnectivityService>;
    let hybridSyncPreferenceService: MockedObject<HybridSyncPreferenceService>;
    let pauseSubject: Subject<void>;
    let resumeSubject: Subject<void>;

    beforeEach(() => {
        vi.useFakeTimers();
        pauseSubject = new Subject<void>();
        resumeSubject = new Subject<void>();

        store = {
            select: vi.fn().mockName("Store.select"),
            dispatch: vi.fn().mockName("Store.dispatch")
        } as unknown as MockedObject<Store>;
        store.select.mockReturnValue(of(false));

        connectivityService = {
            checkBackendReachable: vi.fn().mockName("ConnectivityService.checkBackendReachable"),
            invalidateCache: vi.fn().mockName("ConnectivityService.invalidateCache")
        } as unknown as MockedObject<ConnectivityService>;
        connectivityService.checkBackendReachable.mockResolvedValue(true);

        hybridSyncPreferenceService = {
            getAutoSyncEnabled: vi.fn().mockName("HybridSyncPreferenceService.getAutoSyncEnabled"),
            getAutoSyncIntervalMinutes: vi.fn().mockName("HybridSyncPreferenceService.getAutoSyncIntervalMinutes"),
            isHybridSyncEnabled: vi.fn().mockName("HybridSyncPreferenceService.isHybridSyncEnabled")
        } as unknown as MockedObject<HybridSyncPreferenceService>;
        hybridSyncPreferenceService.getAutoSyncEnabled.mockResolvedValue(true);
        hybridSyncPreferenceService.getAutoSyncIntervalMinutes.mockResolvedValue(60);
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);

        TestBed.configureTestingModule({
            providers: [
                AutoSyncSchedulerService,
                {
                    provide: Platform,
                    useValue: {
                        pause: pauseSubject.asObservable(),
                        resume: resumeSubject.asObservable()
                    }
                },
                { provide: Store, useValue: store },
                { provide: ConnectivityService, useValue: connectivityService },
                { provide: HybridSyncPreferenceService, useValue: hybridSyncPreferenceService },
                { provide: LoggerService, useValue: { log: vi.fn() } }
            ]
        });

        service = TestBed.inject(AutoSyncSchedulerService);
    });

    afterEach(() => {
        pauseSubject.next();
        vi.useRealTimers();
    });

    it('dispatches automatic sync when foreground scheduler ticks', async () => {
        hybridSyncPreferenceService.getAutoSyncIntervalMinutes.mockResolvedValue(30);

        await service.init();
        await vi.advanceTimersByTimeAsync(0);

        expect(store.dispatch).toHaveBeenCalledWith(SyncActions.startAutomaticSync());
    });

    it('does not dispatch when auto sync is disabled', async () => {
        hybridSyncPreferenceService.getAutoSyncEnabled.mockResolvedValue(false);

        await service.init();
        await vi.advanceTimersByTimeAsync(0);

        expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch when backend is unreachable', async () => {
        connectivityService.checkBackendReachable.mockResolvedValue(false);

        await service.init();
        await vi.advanceTimersByTimeAsync(0);

        expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch when a sync is already active', async () => {
        store.select.mockReturnValue(of(true));

        await service.init();
        await vi.advanceTimersByTimeAsync(0);

        expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('stops scheduler on platform pause', async () => {
        await service.init();
        await vi.advanceTimersByTimeAsync(0);
        store.dispatch.mockClear();

        pauseSubject.next();
        await vi.advanceTimersByTimeAsync(60000);

        expect(store.dispatch).not.toHaveBeenCalled();
    });
});
