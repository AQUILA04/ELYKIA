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

  it('should inject collector into StockRequestCreateDto.request', () => {
    client.post('/api/stock-requests/create', {
      request: { items: [{ article: { id: 1 }, quantity: 1 }] },
      forNextMonth: false
    }).subscribe();

    const req = httpMock.expectOne('/api/stock-requests/create');
    expect(req.request.body).toEqual({
      request: { items: [{ article: { id: 1 }, quantity: 1 }], collector: 'testuser' },
      forNextMonth: false
    });
    req.flush({});
  });

  it('should inject collector into stock return create body', () => {
    client.post('/api/stock-returns/create', { items: [] }).subscribe();

    const req = httpMock.expectOne('/api/stock-returns/create');
    expect(req.request.body).toEqual({ items: [], collector: 'testuser' });
    req.flush({});
  });

  it('should NOT modify GET requests on target endpoints', () => {
    client.get('/api/stock-requests').subscribe();

    const req = httpMock.expectOne('/api/stock-requests');
    expect(req.request.method).toBe('GET');
    expect(req.request.body).toBeNull();
    req.flush({});
  });

  it('should pass through without mutation when user is null', () => {
    mockAuthService.currentUser = null;

    client.post('/api/stock-requests/create', { request: { items: [] } }).subscribe();

    const req = httpMock.expectOne('/api/stock-requests/create');
    expect(req.request.body).toEqual({ request: { items: [] } });
    expect(mockLoggerService.log).toHaveBeenCalledWith(jasmine.stringContaining('collector could not be injected'));
    req.flush({});
  });
});
