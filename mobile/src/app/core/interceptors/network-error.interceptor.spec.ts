import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NetworkErrorHandlerInterceptor } from './network-error.interceptor';
import { HealthCheckService } from '../services/health-check.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('NetworkErrorHandlerInterceptor', () => {
    let client: HttpClient;
    let httpMock: HttpTestingController;
    let mockHealthCheckService: MockedObject<HealthCheckService>;
    let mockRouter: MockedObject<Router>;

    beforeEach(() => {
        mockHealthCheckService = {
            pingBackend: vi.fn().mockName("HealthCheckService.pingBackend")
        } as unknown as MockedObject<HealthCheckService>;
        mockRouter = {
            navigate: vi.fn().mockName("Router.navigate")
        } as unknown as MockedObject<Router>;

        TestBed.configureTestingModule({
            imports: [],
            providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
                NetworkErrorHandlerInterceptor,
                { provide: HealthCheckService, useValue: mockHealthCheckService },
                { provide: Router, useValue: mockRouter },
                { provide: HTTP_INTERCEPTORS, useClass: NetworkErrorHandlerInterceptor, multi: true }
            ]
        });

        client = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should navigate to /server-unavailable when status is 0 and backend is offline', async () => {
        mockHealthCheckService.pingBackend.mockReturnValue(of(false));

        client.get('/api/test').subscribe({
            next: () => expect.fail('should not succeed'),
            error: () => {
                expect(mockHealthCheckService.pingBackend).toHaveBeenCalled();
                // When offline, EMPTY is returned, so error should NOT reach here.
                // However, since we return EMPTY, this error callback should NOT fire.
                // If this fires, the interceptor is not using EMPTY correctly.
                throw new Error('Error should not propagate when navigating away');
            },
            complete: () => {
                // EMPTY completes the stream without emitting; complete fires here.
                expect(mockHealthCheckService.pingBackend).toHaveBeenCalled();
                expect(mockRouter.navigate).toHaveBeenCalledWith(['/server-unavailable']);
                ;
            }
        });

        const req = httpMock.expectOne('/api/test');
        req.error(new ProgressEvent('error'), { status: 0 });
    });

    it('should navigate to /server-unavailable when status is 503 and backend is offline', async () => {
        mockHealthCheckService.pingBackend.mockReturnValue(of(false));

        client.get('/api/test').subscribe({
            next: () => expect.fail('should not succeed'),
            error: () => expect.fail('Error should not propagate when navigating away'),
            complete: () => {
                expect(mockHealthCheckService.pingBackend).toHaveBeenCalled();
                expect(mockRouter.navigate).toHaveBeenCalledWith(['/server-unavailable']);
                ;
            }
        });

        const req = httpMock.expectOne('/api/test');
        req.error(new ProgressEvent('error'), { status: 503 });
    });

    it('should NOT navigate when status is 0 but backend is actually online (transient error)', async () => {
        mockHealthCheckService.pingBackend.mockReturnValue(of(true));

        client.get('/api/test').subscribe({
            next: () => expect.fail('should not succeed'),
            error: (err) => {
                // Error propagates to caller because the backend is online
                expect(err.status).toBe(0);
                expect(mockHealthCheckService.pingBackend).toHaveBeenCalled();
                expect(mockRouter.navigate).not.toHaveBeenCalled();
                ;
            }
        });

        const req = httpMock.expectOne('/api/test');
        req.error(new ProgressEvent('error'), { status: 0 });
    });

    it('should NOT call pingBackend for non-network errors (e.g. 404)', async () => {
        client.get('/api/test').subscribe({
            next: () => expect.fail('should not succeed'),
            error: (err) => {
                expect(err.status).toBe(404);
                expect(mockHealthCheckService.pingBackend).not.toHaveBeenCalled();
                expect(mockRouter.navigate).not.toHaveBeenCalled();
                ;
            }
        });

        const req = httpMock.expectOne('/api/test');
        req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should NOT recurse when the health-check endpoint itself returns status 0', async () => {
        // This verifies the infinite-loop guard: the interceptor must skip /actuator/health
        client.get('/actuator/health').subscribe({
            next: () => expect.fail('should not succeed'),
            error: (err) => {
                expect(err.status).toBe(0);
                // pingBackend must NOT be called; otherwise we'd recurse infinitely.
                expect(mockHealthCheckService.pingBackend).not.toHaveBeenCalled();
                expect(mockRouter.navigate).not.toHaveBeenCalled();
                ;
            }
        });

        const req = httpMock.expectOne('/actuator/health');
        req.error(new ProgressEvent('error'), { status: 0 });
    });
});
