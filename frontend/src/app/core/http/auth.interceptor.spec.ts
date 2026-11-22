import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../auth/service/auth.service';
import { AuthInterceptor } from './auth.interceptor';
import { AlertService } from '@shared/service/alert.service';
import { SessionExpiryState } from '@shared/service/session-expiry.state';
import { TokenStorageService } from '@shared/service/token-storage.service';

describe('AuthInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let tokenStorage: MockedObject<Pick<TokenStorageService, 'getToken'>>;
    let authService: MockedObject<Pick<AuthService, 'logout'>>;
    let alertService: MockedObject<Pick<AlertService, 'notifySessionExpired'>>;
    let sessionExpiry: SessionExpiryState;

    beforeEach(() => {
        tokenStorage = {
            getToken: vi.fn().mockName("TokenStorageService.getToken")
        };
        authService = {
            logout: vi.fn().mockName("AuthService.logout")
        };
        alertService = {
            notifySessionExpired: vi.fn().mockName("AlertService.notifySessionExpired")
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                provideRouter([]),
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
        tokenStorage.getToken.mockReturnValue('expired-token');
        const errors: number[] = [];
        http.get('/api/tontine/session').subscribe({ error: () => errors.push(1) });
        http.get('/api/tontine/members').subscribe({ error: () => errors.push(1) });

        const requests = httpMock.match(() => true);
        expect(requests.length).toBe(2);
        requests.forEach((req) => {
            expect(req.request.headers.get('Authorization')).toBe('Bearer expired-token');
            req.flush({ message: 'Full authentication is required to access this resource' }, { status: 401, statusText: 'Unauthorized' });
        });

        expect(authService.logout).toHaveBeenCalledTimes(1);
        expect(alertService.notifySessionExpired).toHaveBeenCalledTimes(1);
        expect(sessionExpiry.isActive()).toBe(true);
        expect(errors.length).toBe(2);
    });

    it('does not logout when sign-in is rejected', () => {
        tokenStorage.getToken.mockReturnValue(null);
        http.post('/api/auth/signin', { username: 'a', password: 'b' }).subscribe({ error: () => undefined });

        const req = httpMock.expectOne('/api/auth/signin');
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush({ message: 'Bad credentials' }, { status: 401, statusText: 'Unauthorized' });

        expect(authService.logout).not.toHaveBeenCalled();
        expect(sessionExpiry.isActive()).toBe(false);
    });

    it('does not logout a newer session when an old request returns 401', () => {
        tokenStorage.getToken.mockReturnValue('old-token');
        http.get('/api/tontine/session').subscribe({ error: () => undefined });

        const req = httpMock.expectOne('/api/tontine/session');
        tokenStorage.getToken.mockReturnValue('new-token');
        req.flush({ message: 'Full authentication is required to access this resource' }, { status: 401, statusText: 'Unauthorized' });

        expect(authService.logout).not.toHaveBeenCalled();
    });

    it('ignores a 401 on the login page when the token is already gone', () => {
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/login');
        tokenStorage.getToken.mockReturnValue('expired-token');
        http.get('/api/tontine/session').subscribe({ error: () => undefined });

        const req = httpMock.expectOne('/api/tontine/session');
        tokenStorage.getToken.mockReturnValue(null);
        req.flush({ message: 'Full authentication is required to access this resource' }, { status: 401, statusText: 'Unauthorized' });

        expect(authService.logout).not.toHaveBeenCalled();
    });
});
