import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../auth/service/auth.service';
import { AuthInterceptor } from './auth.interceptor';
import { AlertService } from './service/alert.service';
import { SessionExpiryState } from './service/session-expiry.state';
import { TokenStorageService } from './service/token-storage.service';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStorage: jasmine.SpyObj<TokenStorageService>;
  let authService: jasmine.SpyObj<AuthService>;
  let alertService: jasmine.SpyObj<AlertService>;
  let sessionExpiry: SessionExpiryState;

  beforeEach(() => {
    tokenStorage = jasmine.createSpyObj('TokenStorageService', ['getToken']);
    authService = jasmine.createSpyObj('AuthService', ['logout']);
    alertService = jasmine.createSpyObj('AlertService', ['notifySessionExpired']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        SessionExpiryState,
        { provide: TokenStorageService, useValue: tokenStorage },
        { provide: AuthService, useValue: authService },
        { provide: AlertService, useValue: alertService },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    sessionExpiry = TestBed.inject(SessionExpiryState);
    sessionExpiry.end();
  });

  afterEach(() => {
    httpMock.verify();
    sessionExpiry.end();
  });

  it('logs out once when several authenticated calls return 401', () => {
    tokenStorage.getToken.and.returnValue('expired-token');
    const errors: number[] = [];
    http.get('/api/tontine/session').subscribe({ error: () => errors.push(1) });
    http.get('/api/tontine/members').subscribe({ error: () => errors.push(1) });

    const requests = httpMock.match(() => true);
    expect(requests.length).toBe(2);
    requests.forEach((req) => {
      expect(req.request.headers.get('Authorization')).toBe('Bearer expired-token');
      req.flush(
        { message: 'Full authentication is required to access this resource' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(alertService.notifySessionExpired).toHaveBeenCalledTimes(1);
    expect(sessionExpiry.isActive()).toBeTrue();
    expect(errors.length).toBe(2);
  });

  it('does not logout when sign-in is rejected', () => {
    tokenStorage.getToken.and.returnValue(null);
    http.post('/api/auth/signin', { username: 'a', password: 'b' }).subscribe({ error: () => undefined });

    const req = httpMock.expectOne('/api/auth/signin');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ message: 'Bad credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(sessionExpiry.isActive()).toBeFalse();
  });

  it('does not logout a newer session when an old request returns 401', () => {
    tokenStorage.getToken.and.returnValue('old-token');
    http.get('/api/tontine/session').subscribe({ error: () => undefined });

    const req = httpMock.expectOne('/api/tontine/session');
    tokenStorage.getToken.and.returnValue('new-token');
    req.flush(
      { message: 'Full authentication is required to access this resource' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('ignores a 401 on the login page when the token is already gone', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/login');
    tokenStorage.getToken.and.returnValue('expired-token');
    http.get('/api/tontine/session').subscribe({ error: () => undefined });

    const req = httpMock.expectOne('/api/tontine/session');
    tokenStorage.getToken.and.returnValue(null);
    req.flush(
      { message: 'Full authentication is required to access this resource' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(authService.logout).not.toHaveBeenCalled();
  });
});
