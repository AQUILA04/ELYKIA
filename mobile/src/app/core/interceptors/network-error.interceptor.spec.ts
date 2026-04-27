import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { NetworkErrorHandlerInterceptor } from './network-error.interceptor';
import { HealthCheckService } from '../services/health-check.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('NetworkErrorHandlerInterceptor', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let mockHealthCheckService: jasmine.SpyObj<HealthCheckService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockHealthCheckService = jasmine.createSpyObj('HealthCheckService', ['pingBackend']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
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

  it('should navigate to /server-unavailable when status is 0 and backend is offline', (done) => {
    mockHealthCheckService.pingBackend.and.returnValue(of(false));

    client.get('/api/test').subscribe({
      next: () => fail('should not succeed'),
      error: () => {
        expect(mockHealthCheckService.pingBackend).toHaveBeenCalled();
        // When offline, EMPTY is returned, so error should NOT reach here.
        // However, since we return EMPTY, this error callback should NOT fire.
        // If this fires, the interceptor is not using EMPTY correctly.
        fail('Error should not propagate when navigating away');
      },
      complete: () => {
        // EMPTY completes the stream without emitting; complete fires here.
        expect(mockHealthCheckService.pingBackend).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/server-unavailable']);
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.error(new ProgressEvent('error'), { status: 0 });
  });

  it('should navigate to /server-unavailable when status is 503 and backend is offline', (done) => {
    mockHealthCheckService.pingBackend.and.returnValue(of(false));

    client.get('/api/test').subscribe({
      next: () => fail('should not succeed'),
      error: () => fail('Error should not propagate when navigating away'),
      complete: () => {
        expect(mockHealthCheckService.pingBackend).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/server-unavailable']);
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.error(new ProgressEvent('error'), { status: 503 });
  });

  it('should NOT navigate when status is 0 but backend is actually online (transient error)', (done) => {
    mockHealthCheckService.pingBackend.and.returnValue(of(true));

    client.get('/api/test').subscribe({
      next: () => fail('should not succeed'),
      error: (err) => {
        // Error propagates to caller because the backend is online
        expect(err.status).toBe(0);
        expect(mockHealthCheckService.pingBackend).toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.error(new ProgressEvent('error'), { status: 0 });
  });

  it('should NOT call pingBackend for non-network errors (e.g. 404)', (done) => {
    client.get('/api/test').subscribe({
      next: () => fail('should not succeed'),
      error: (err) => {
        expect(err.status).toBe(404);
        expect(mockHealthCheckService.pingBackend).not.toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should NOT recurse when the health-check endpoint itself returns status 0', (done) => {
    // This verifies the infinite-loop guard: the interceptor must skip /actuator/health
    client.get('/actuator/health').subscribe({
      next: () => fail('should not succeed'),
      error: (err) => {
        expect(err.status).toBe(0);
        // pingBackend must NOT be called; otherwise we'd recurse infinitely.
        expect(mockHealthCheckService.pingBackend).not.toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('/actuator/health');
    req.error(new ProgressEvent('error'), { status: 0 });
  });
});
