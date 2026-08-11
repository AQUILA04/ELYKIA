import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { HealthCheckService } from './health-check.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  /** TTL ping backend (spec: 120s). */
  static readonly CACHE_TTL_MS = 120_000;
  static readonly PING_TIMEOUT_MS = 4_000;

  private cachedReachable: boolean | null = null;
  private cacheExpiresAt = 0;
  private inflightCheck: Promise<boolean> | null = null;

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly platform: Platform,
    private readonly log: LoggerService
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.invalidateCache());
    }
    this.platform.resume?.subscribe(() => this.invalidateCache());
  }

  invalidateCache(): void {
    this.cachedReachable = null;
    this.cacheExpiresAt = 0;
    this.inflightCheck = null;
  }

  isBackendReachable(forceRefresh = false): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      this.checkBackendReachable(forceRefresh)
        .then((reachable) => {
          subscriber.next(reachable);
          subscriber.complete();
        })
        .catch(() => {
          subscriber.next(false);
          subscriber.complete();
        });
    });
  }

  async checkBackendReachable(forceRefresh = false): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setCache(false);
      return false;
    }

    if (!forceRefresh && this.cachedReachable !== null && Date.now() < this.cacheExpiresAt) {
      return this.cachedReachable;
    }

    if (this.inflightCheck) {
      return this.inflightCheck;
    }

    this.inflightCheck = this.performPing()
      .finally(() => {
        this.inflightCheck = null;
      });

    return this.inflightCheck;
  }

  private async performPing(): Promise<boolean> {
    try {
      const reachable = await firstValueFrom(
        this.healthCheckService.pingBackend().pipe(
          timeout(ConnectivityService.PING_TIMEOUT_MS),
          catchError(() => of(false))
        )
      );
      this.setCache(reachable);
      return reachable;
    } catch (error) {
      void this.log.log(`[ConnectivityService] ping failed: ${String(error)}`);
      this.setCache(false);
      return false;
    }
  }

  private setCache(reachable: boolean): void {
    this.cachedReachable = reachable;
    this.cacheExpiresAt = Date.now() + ConnectivityService.CACHE_TTL_MS;
  }
}
