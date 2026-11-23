import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
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

  it('saves offline when the token has expired (401) instead of dropping the entry', async () => {
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);
    connectivityService.checkBackendReachable.and.resolveTo(true);
    const saveOffline = jasmine.createSpy('saveOffline').and.resolveTo({ id: 'local-401' });

    const result = await coordinator.executeWrite({
      entityLabel: 'contrôle',
      saveOnline: async () => { throw new HttpErrorResponse({ status: 401 }); },
      saveOffline
    });

    expect(result.mode).toBe('offline');
    expect(saveOffline).toHaveBeenCalled();
    expect(coordinator.isBusinessError(new HttpErrorResponse({ status: 401 }))).toBeFalse();
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

  it('keeps the HTTP status so a 409 duplicate is not saved offline', async () => {
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);
    connectivityService.checkBackendReachable.and.resolveTo(true);
    const saveOffline = jasmine.createSpy('saveOffline');

    let caught: unknown;
    try {
      await coordinator.executeWrite({
        entityLabel: 'tontine-delivery',
        saveOnline: async () => {
          throw new HttpErrorResponse({ status: 409, error: { message: 'Ce membre a déjà été livré' } });
        },
        saveOffline
      });
    } catch (error) {
      caught = error;
    }

    expect(caught instanceof OnlineWriteError).toBeTrue();
    expect((caught as OnlineWriteError).status).toBe(409);
    expect((caught as OnlineWriteError).isServerConflict).toBeTrue();
    expect((caught as OnlineWriteError).message).toBe('Ce membre a déjà été livré');
    expect(saveOffline).not.toHaveBeenCalled();
  });

  it('does not flag an ordinary 400 as a server conflict', () => {
    expect(new OnlineWriteError(WriteErrorKind.BUSINESS, 'x', 400).isServerConflict).toBeFalse();
    expect(new OnlineWriteError(WriteErrorKind.BUSINESS, 'x').isServerConflict).toBeFalse();
  });
});
