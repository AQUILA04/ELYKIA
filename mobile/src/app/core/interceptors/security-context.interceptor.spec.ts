import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { SecurityContextInterceptor } from './security-context.interceptor';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';

describe('SecurityContextInterceptor', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let mockAuthService: Partial<{ currentUser: { username: string } | null }>;
  let mockLoggerService: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    mockAuthService = {
      currentUser: { username: 'testuser' }
    };

    mockLoggerService = jasmine.createSpyObj('LoggerService', ['log']);
    mockLoggerService.log.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SecurityContextInterceptor,
        { provide: AuthService, useValue: mockAuthService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: HTTP_INTERCEPTORS, useClass: SecurityContextInterceptor, multi: true }
      ]
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should inject commercialUsername into POST requests to /api/stock-requests', () => {
    client.post('/api/stock-requests', { someData: '123' }).subscribe();

    const req = httpMock.expectOne('/api/stock-requests');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ someData: '123', commercialUsername: 'testuser' });
    req.flush({});
  });

  it('should inject commercialUsername into PUT requests to /api/stock-returns', () => {
    client.put('/api/stock-returns/42', { quantity: 5 }).subscribe();

    const req = httpMock.expectOne('/api/stock-returns/42');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ quantity: 5, commercialUsername: 'testuser' });
    req.flush({});
  });

  it('should inject commercialUsername into PATCH requests to /api/v1/stock-tontine-requests', () => {
    client.patch('/api/v1/stock-tontine-requests/1', { status: 'PENDING' }).subscribe();

    const req = httpMock.expectOne('/api/v1/stock-tontine-requests/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'PENDING', commercialUsername: 'testuser' });
    req.flush({});
  });

  it('should NOT add commercialUsername to GET requests on target endpoints', () => {
    client.get('/api/stock-requests').subscribe();

    const req = httpMock.expectOne('/api/stock-requests');
    expect(req.request.method).toBe('GET');
    expect(req.request.body).toBeNull();
    req.flush({});
  });

  it('should NOT modify POST requests to non-target endpoints', () => {
    client.post('/api/other', { someData: '123' }).subscribe();

    const req = httpMock.expectOne('/api/other');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ someData: '123' });
    req.flush({});
  });

  it('should pass request through without mutation and log a warning when user is null', () => {
    mockAuthService.currentUser = null;

    client.post('/api/stock-requests', { someData: '123' }).subscribe();

    const req = httpMock.expectOne('/api/stock-requests');
    // Body must NOT contain commercialUsername since there is no logged-in user
    expect(req.request.body).toEqual({ someData: '123' });
    expect(mockLoggerService.log).toHaveBeenCalledWith(jasmine.stringContaining('commercialUsername could not be injected'));
    req.flush({});
  });
});
