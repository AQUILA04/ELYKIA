import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserJournalService } from './user-journal.service';
import { CrashReporterService } from './crash-reporter.service';
import { AnalyticsReporterService } from './analytics-reporter.service';
import { environment } from '../../../environments/environment';

describe('UserJournalService', () => {
  let service: UserJournalService;
  let httpMock: HttpTestingController;
  let crash: jasmine.SpyObj<CrashReporterService>;
  let analytics: jasmine.SpyObj<AnalyticsReporterService>;
  const originalTelemetry = environment.telemetryEnabled;

  beforeEach(() => {
    (environment as { telemetryEnabled: boolean }).telemetryEnabled = true;
    localStorage.clear();
    crash = jasmine.createSpyObj('CrashReporterService', [
      'init', 'setUserId', 'setCustomKey', 'log', 'recordException',
    ]);
    analytics = jasmine.createSpyObj('AnalyticsReporterService', [
      'init', 'setUserId', 'logEvent', 'logScreenView',
    ]);
    crash.init.and.resolveTo();
    analytics.init.and.resolveTo();
    crash.setCustomKey.and.resolveTo();
    crash.log.and.resolveTo();
    analytics.logEvent.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserJournalService,
        { provide: CrashReporterService, useValue: crash },
        { provide: AnalyticsReporterService, useValue: analytics },
      ],
    });
    service = TestBed.inject(UserJournalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    (environment as { telemetryEnabled: boolean }).telemetryEnabled = originalTelemetry;
    localStorage.clear();
    httpMock.verify();
    service.ngOnDestroy();
  });

  it('queues events and flushes a batch', async () => {
    await service.init();
    service.track('PHONE_SUBMITTED', 'AUTH', { pin: '1234', amount: 1 });
    const queued = service.getQueueSnapshot();
    expect(queued.length).toBe(1);
    expect(queued[0].metadata).toEqual(jasmine.objectContaining({ amount: 1 }));
    expect(queued[0].metadata?.['pin']).toBeUndefined();

    const flushPromise = service.flush();
    const req = httpMock.expectOne((r) => r.url.includes('/api/customer/auth/activity-logs'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.events.length).toBe(1);
    req.flush({ accepted: 1 });
    await flushPromise;
    expect(service.getQueueSnapshot().length).toBe(0);
  });

  it('does nothing when telemetry disabled', () => {
    (environment as { telemetryEnabled: boolean }).telemetryEnabled = false;
    service.track('APP_OPEN', 'AUTH');
    expect(service.getQueueSnapshot().length).toBe(0);
  });
});
