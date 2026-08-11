import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Platform } from '@ionic/angular';
import { HealthCheckService } from './health-check.service';
import { LoggerService } from './logger.service';
import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
  let service: ConnectivityService;
  let healthCheckService: jasmine.SpyObj<HealthCheckService>;

  beforeEach(() => {
    healthCheckService = jasmine.createSpyObj('HealthCheckService', ['pingBackend']);

    TestBed.configureTestingModule({
      providers: [
        ConnectivityService,
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: Platform, useValue: { resume: of(undefined), pause: of(undefined) } },
        { provide: LoggerService, useValue: { log: jasmine.createSpy('log') } }
      ]
    });

    service = TestBed.inject(ConnectivityService);
  });

  it('returns false immediately when navigator is offline', async () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(false);

    await expectAsync(service.checkBackendReachable(true)).toBeResolvedTo(false);
    expect(healthCheckService.pingBackend).not.toHaveBeenCalled();
  });

  it('caches ping result for subsequent calls', async () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(true);
    healthCheckService.pingBackend.and.returnValue(of(true));

    await expectAsync(service.checkBackendReachable()).toBeResolvedTo(true);
    await expectAsync(service.checkBackendReachable()).toBeResolvedTo(true);

    expect(healthCheckService.pingBackend).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache and pings again after invalidateCache', async () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(true);
    healthCheckService.pingBackend.and.returnValue(of(true));

    await service.checkBackendReachable();
    service.invalidateCache();
    await service.checkBackendReachable();

    expect(healthCheckService.pingBackend).toHaveBeenCalledTimes(2);
  });

  it('caches false result when ping fails', async () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(true);
    healthCheckService.pingBackend.and.returnValue(throwError(() => new Error('network')));

    await expectAsync(service.checkBackendReachable(true)).toBeResolvedTo(false);
  });
});
