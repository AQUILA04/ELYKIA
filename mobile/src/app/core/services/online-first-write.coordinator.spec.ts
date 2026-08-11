import { TestBed } from '@angular/core/testing';
import { OnlineFirstWriteCoordinator } from './online-first-write.coordinator';
import { ConnectivityService } from './connectivity.service';
import { HybridSyncPreferenceService } from './hybrid-sync-preference.service';
import { LoggerService } from './logger.service';
import { OnlineWriteError, WriteErrorKind } from './online-first-write.types';

describe('OnlineFirstWriteCoordinator', () => {
  let coordinator: OnlineFirstWriteCoordinator;
  let connectivityService: jasmine.SpyObj<ConnectivityService>;
  let hybridSyncPreferenceService: jasmine.SpyObj<HybridSyncPreferenceService>;

  beforeEach(() => {
    connectivityService = jasmine.createSpyObj('ConnectivityService', ['checkBackendReachable']);
    hybridSyncPreferenceService = jasmine.createSpyObj('HybridSyncPreferenceService', ['isHybridSyncEnabled']);

    TestBed.configureTestingModule({
      providers: [
        OnlineFirstWriteCoordinator,
        { provide: ConnectivityService, useValue: connectivityService },
        { provide: HybridSyncPreferenceService, useValue: hybridSyncPreferenceService },
        { provide: LoggerService, useValue: { log: jasmine.createSpy('log') } }
      ]
    });

    coordinator = TestBed.inject(OnlineFirstWriteCoordinator);
  });

  it('uses online path when backend is reachable', async () => {
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);
    connectivityService.checkBackendReachable.and.resolveTo(true);

    const saveOnline = jasmine.createSpy('saveOnline').and.resolveTo({ id: 'server-1' });
    const saveOffline = jasmine.createSpy('saveOffline');

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
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);
    connectivityService.checkBackendReachable.and.resolveTo(false);

    const saveOnline = jasmine.createSpy('saveOnline');
    const saveOffline = jasmine.createSpy('saveOffline').and.resolveTo({ id: 'local-1' });

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
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);
    connectivityService.checkBackendReachable.and.resolveTo(true);

    await expectAsync(coordinator.executeWrite({
      entityLabel: 'client',
      saveOnline: async () => {
        throw new OnlineWriteError(WriteErrorKind.BUSINESS, 'Code client déjà utilisé');
      },
      saveOffline: async () => ({ id: 'local' })
    })).toBeRejectedWithError('Code client déjà utilisé');
  });
});
