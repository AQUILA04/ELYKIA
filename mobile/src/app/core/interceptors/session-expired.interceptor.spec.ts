import type { Mock } from "vitest";
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TimeoutInterceptor } from './timeout.interceptor';
import { SessionExpiredInterceptor, isRejectedAuthenticatedCall, } from './session-expired.interceptor';
import { AuthService } from '../services/auth.service';

describe('isRejectedAuthenticatedCall', () => {
    it('accepts a business 401', () => {
        expect(isRejectedAuthenticatedCall('https://elykia.example/api/v1/recovery-manager/field-plans/collector-stats', 401)).toBe(true);
    });

    it('ignores sign-in, health and release checks', () => {
        expect(isRejectedAuthenticatedCall('https://elykia.example/api/auth/signin', 401)).toBe(false);
        expect(isRejectedAuthenticatedCall('https://elykia.example/actuator/health', 401)).toBe(false);
        expect(isRejectedAuthenticatedCall('https://elykia.example/api/v1/mobile/app/release/latest', 401)).toBe(false);
    });

    it('ignores other status codes', () => {
        expect(isRejectedAuthenticatedCall('https://elykia.example/api/v1/recovery-manager/field-plans', 403)).toBe(false);
        expect(isRejectedAuthenticatedCall('https://elykia.example/api/v1/recovery-manager/field-plans', 500)).toBe(false);
    });
});

describe('SessionExpiredInterceptor', () => {
    let client: HttpClient;
    let httpMock: HttpTestingController;
    let authService: {
        handleUnauthorized: Mock;
    };

    const statsUrl = '/api/v1/recovery-manager/field-plans/collector-stats';

    beforeEach(() => {
        authService = {
            handleUnauthorized: vi.fn().mockReturnValue(true),
        };

        TestBed.configureTestingModule({
            imports: [],
            providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
                SessionExpiredInterceptor,
                TimeoutInterceptor,
                { provide: AuthService, useValue: authService },
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

    it('ends the session on a business 401 and does not surface the error', async () => {
        vi.useFakeTimers();
        try {
            let errored = false;
            const sub = client.get(statsUrl).subscribe({
                next: () => expect.fail('should not emit'),
                error: () => errored = true,
            });

            const req = httpMock.expectOne(statsUrl);
            req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
            await vi.advanceTimersByTimeAsync(31000);

            expect(authService.handleUnauthorized).toHaveBeenCalledTimes(1);
            expect(errored).toBe(false);
            sub.unsubscribe();
        } finally {
            vi.useRealTimers();
        }
    });

    it('propagates a 401 when no session is open', () => {
        authService.handleUnauthorized.mockReturnValue(false);
        let status = 0;
        client.get(statsUrl).subscribe({
            error: (error) => status = error.status,
        });

        const req = httpMock.expectOne(statsUrl);
        req.flush({}, { status: 401, statusText: 'Unauthorized' });
        expect(status).toBe(401);
    });

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
