import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Platform } from '@ionic/angular';
import { HealthCheckService } from './health-check.service';
import { LoggerService } from './logger.service';
import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
    let service: ConnectivityService;
    let healthCheckService: MockedObject<HealthCheckService>;

    beforeEach(() => {
        healthCheckService = {
            pingBackend: vi.fn().mockName("HealthCheckService.pingBackend")
        } as unknown as MockedObject<HealthCheckService>;

        TestBed.configureTestingModule({
            providers: [
                ConnectivityService,
                { provide: HealthCheckService, useValue: healthCheckService },
                { provide: Platform, useValue: { resume: of(undefined), pause: of(undefined) } },
                { provide: LoggerService, useValue: { log: vi.fn() } }
            ]
        });

        service = TestBed.inject(ConnectivityService);
    });

    it('returns false immediately when navigator is offline', async () => {
        vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

        await expect(service.checkBackendReachable(true)).resolves.toEqual(false);
        expect(healthCheckService.pingBackend).not.toHaveBeenCalled();
    });

    it('caches ping result for subsequent calls', async () => {
        vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
        healthCheckService.pingBackend.mockReturnValue(of(true));

        await expect(service.checkBackendReachable()).resolves.toEqual(true);
        await expect(service.checkBackendReachable()).resolves.toEqual(true);

        expect(healthCheckService.pingBackend).toHaveBeenCalledTimes(1);
    });

    it('invalidates cache and pings again after invalidateCache', async () => {
        vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
        healthCheckService.pingBackend.mockReturnValue(of(true));

        await service.checkBackendReachable();
        service.invalidateCache();
        await service.checkBackendReachable();

        expect(healthCheckService.pingBackend).toHaveBeenCalledTimes(2);
    });

    it('caches false result when ping fails', async () => {
        vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
        healthCheckService.pingBackend.mockReturnValue(throwError(() => new Error('network')));

        await expect(service.checkBackendReachable(true)).resolves.toEqual(false);
    });
});
