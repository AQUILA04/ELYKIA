import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { TimeoutInterceptor } from './timeout.interceptor';
import {
  SessionExpiredInterceptor,
  isRejectedAuthenticatedCall,
} from './session-expired.interceptor';
import { AuthService } from '../services/auth.service';
import { RmPendingQueuesService } from '../services/rm/rm-pending-queues.service';

describe('isRejectedAuthenticatedCall', () => {
  it('accepts a business 401', () => {
    expect(isRejectedAuthenticatedCall(
      'https://elykia.example/api/v1/recovery-manager/field-plans/collector-stats',
      401
    )).toBeTrue();
  });

  it('ignores sign-in, health and release checks', () => {
    expect(isRejectedAuthenticatedCall('https://elykia.example/api/auth/signin', 401)).toBeFalse();
    expect(isRejectedAuthenticatedCall('https://elykia.example/actuator/health', 401)).toBeFalse();
    expect(isRejectedAuthenticatedCall('https://elykia.example/api/v1/mobile/app/release/latest', 401)).toBeFalse();
  });

  it('ignores other status codes', () => {
    expect(isRejectedAuthenticatedCall('https://elykia.example/api/v1/recovery-manager/field-plans', 403)).toBeFalse();
    expect(isRejectedAuthenticatedCall('https://elykia.example/api/v1/recovery-manager/field-plans', 500)).toBeFalse();
  });
});

describe('SessionExpiredInterceptor', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let authService: { handleUnauthorized: jasmine.Spy; notifySessionExpiredKeepingData: jasmine.Spy; refreshAccessToken: jasmine.Spy };
  let rmPending: { hasPending: jasmine.Spy };

  const statsUrl = '/api/v1/recovery-manager/field-plans/collector-stats';

  beforeEach(() => {
    authService = {
      handleUnauthorized: jasmine.createSpy('handleUnauthorized').and.returnValue(true),
      notifySessionExpiredKeepingData: jasmine.createSpy('notifySessionExpiredKeepingData'),
      refreshAccessToken: jasmine.createSpy('refreshAccessToken').and.resolveTo(false),
    };
    rmPending = { hasPending: jasmine.createSpy('hasPending').and.resolveTo(false) };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SessionExpiredInterceptor,
        TimeoutInterceptor,
        { provide: AuthService, useValue: authService },
        { provide: RmPendingQueuesService, useValue: rmPending },
        { provide: HTTP_INTERCEPTORS, useClass: SessionExpiredInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: TimeoutInterceptor, multi: true },
      ],
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renews the token silently and replays the request without ending the session', fakeAsync(() => {
    authService.refreshAccessToken.and.resolveTo(true);
    let body: unknown;
    client.get(statsUrl).subscribe(value => body = value);

    httpMock.expectOne(statsUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    flushMicrotasks();
    httpMock.expectOne(statsUrl).flush({ ok: true });

    expect(body).toEqual({ ok: true });
    expect(authService.handleUnauthorized).not.toHaveBeenCalled();
    expect(authService.notifySessionExpiredKeepingData).not.toHaveBeenCalled();
  }));

  it('falls back to the safe path when the replay is rejected again', fakeAsync(() => {
    authService.refreshAccessToken.and.resolveTo(true);
    rmPending.hasPending.and.resolveTo(true);
    let status = 0;
    client.get(statsUrl).subscribe({ error: (error) => status = error.status });

    httpMock.expectOne(statsUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    flushMicrotasks();
    httpMock.expectOne(statsUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    flushMicrotasks();

    expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authService.notifySessionExpiredKeepingData).toHaveBeenCalledTimes(1);
    expect(status).toBe(401);
  }));

  it('keeps the session and surfaces the 401 when RM entries are still unsynced', fakeAsync(() => {
    rmPending.hasPending.and.resolveTo(true);
    let status = 0;
    client.get(statsUrl).subscribe({ error: (error) => status = error.status });

    httpMock.expectOne(statsUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    flushMicrotasks();

    expect(authService.handleUnauthorized).not.toHaveBeenCalled();
    expect(authService.notifySessionExpiredKeepingData).toHaveBeenCalledTimes(1);
    expect(status).toBe(401);
  }));

  it('ends the session on a business 401 and does not surface the error', fakeAsync(() => {
    let errored = false;
    const sub = client.get(statsUrl).subscribe({
      next: () => fail('should not emit'),
      error: () => errored = true,
    });

    const req = httpMock.expectOne(statsUrl);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    flushMicrotasks();
    tick(31_000);

    expect(authService.handleUnauthorized).toHaveBeenCalledTimes(1);
    expect(errored).toBeFalse();
    sub.unsubscribe();
  }));

  it('propagates a 401 when no session is open', fakeAsync(() => {
    authService.handleUnauthorized.and.returnValue(false);
    let status = 0;
    client.get(statsUrl).subscribe({
      error: (error) => status = error.status,
    });

    const req = httpMock.expectOne(statsUrl);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    flushMicrotasks();
    expect(status).toBe(401);
  }));

  it('does not end the session on a refused sign-in', () => {
    let status = 0;
    client.post('/api/auth/signin', { username: 'a', password: 'b' }).subscribe({
      error: (error) => status = error.status,
    });

    const req = httpMock.expectOne('/api/auth/signin');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(authService.handleUnauthorized).not.toHaveBeenCalled();
    expect(status).toBe(401);
  });

  it('propagates a non-401 error', () => {
    let status = 0;
    client.get(statsUrl).subscribe({
      error: (error) => status = error.status,
    });

    const req = httpMock.expectOne(statsUrl);
    req.flush({}, { status: 500, statusText: 'Server Error' });
    expect(authService.handleUnauthorized).not.toHaveBeenCalled();
    expect(status).toBe(500);
  });
});
