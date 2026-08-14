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
  let store: jasmine.SpyObj<Store>;
  let connectivityService: jasmine.SpyObj<ConnectivityService>;
  let hybridSyncPreferenceService: jasmine.SpyObj<HybridSyncPreferenceService>;
  let pauseSubject: Subject<void>;
  let resumeSubject: Subject<void>;

  beforeEach(() => {
    pauseSubject = new Subject<void>();
    resumeSubject = new Subject<void>();

    store = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    store.select.and.returnValue(of(false));

    connectivityService = jasmine.createSpyObj('ConnectivityService', ['checkBackendReachable', 'invalidateCache']);
    connectivityService.checkBackendReachable.and.resolveTo(true);

    hybridSyncPreferenceService = jasmine.createSpyObj('HybridSyncPreferenceService', [
      'getAutoSyncEnabled',
      'getAutoSyncIntervalMinutes',
      'isHybridSyncEnabled'
    ]);
    hybridSyncPreferenceService.getAutoSyncEnabled.and.resolveTo(true);
    hybridSyncPreferenceService.getAutoSyncIntervalMinutes.and.resolveTo(60);
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);

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
        { provide: LoggerService, useValue: { log: jasmine.createSpy('log') } }
      ]
    });

    service = TestBed.inject(AutoSyncSchedulerService);
  });

  it('dispatches automatic sync when foreground scheduler ticks', fakeAsync(async () => {
    hybridSyncPreferenceService.getAutoSyncIntervalMinutes.and.resolveTo(30);

    await service.init();
    tick(0);

    expect(store.dispatch).toHaveBeenCalledWith(SyncActions.startAutomaticSync());
  }));

  it('does not dispatch when auto sync is disabled', fakeAsync(async () => {
    hybridSyncPreferenceService.getAutoSyncEnabled.and.resolveTo(false);

    await service.init();
    tick(0);

    expect(store.dispatch).not.toHaveBeenCalled();
  }));

  it('does not dispatch when backend is unreachable', fakeAsync(async () => {
    connectivityService.checkBackendReachable.and.resolveTo(false);

    await service.init();
    tick(0);

    expect(store.dispatch).not.toHaveBeenCalled();
  }));

  it('does not dispatch when a sync is already active', fakeAsync(async () => {
    store.select.and.returnValue(of(true));

    await service.init();
    tick(0);

    expect(store.dispatch).not.toHaveBeenCalled();
  }));

  it('stops scheduler on platform pause', fakeAsync(async () => {
    await service.init();
    tick(0);
    store.dispatch.calls.reset();

    pauseSubject.next();
    tick(60_000);

    expect(store.dispatch).not.toHaveBeenCalled();
  }));
});
