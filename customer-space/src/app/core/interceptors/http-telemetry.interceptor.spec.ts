import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpTelemetryInterceptor } from './http-telemetry.interceptor';
import { UserJournalService } from '../telemetry/user-journal.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';

describe('HttpTelemetryInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let journal: jasmine.SpyObj<UserJournalService>;

  beforeEach(() => {
    journal = jasmine.createSpyObj('UserJournalService', ['track']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: UserJournalService, useValue: journal },
        { provide: CustomerSessionService, useValue: { isAuthenticated: false } },
        { provide: HTTP_INTERCEPTORS, useClass: HttpTelemetryInterceptor, multi: true },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds correlation headers', () => {
    http.get('/api/customer/dashboard').subscribe({ error: () => undefined });
    const req = httpMock.expectOne('/api/customer/dashboard');
    expect(req.request.headers.has('X-Elykia-Device-Id')).toBeTrue();
    expect(req.request.headers.has('X-Elykia-Session-Id')).toBeTrue();
    expect(req.request.headers.has('X-Request-Id')).toBeTrue();
    req.flush({});
  });

  it('does not journal errors from activity-logs endpoint', () => {
    http.post('/api/customer/auth/activity-logs', { events: [] }).subscribe({
      error: () => undefined,
    });
    const req = httpMock.expectOne('/api/customer/auth/activity-logs');
    req.flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });
    expect(journal.track).not.toHaveBeenCalled();
  });

  it('journals HTTP_ERROR for failed API calls', () => {
    http.get('/api/customer/purchases').subscribe({ error: () => undefined });
    const req = httpMock.expectOne('/api/customer/purchases');
    req.flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });
    expect(journal.track).toHaveBeenCalledWith(
      'HTTP_ERROR',
      'ERROR',
      jasmine.objectContaining({ httpStatus: 500 }),
    );
  });
});
