import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { ConnectivityService } from '../connectivity.service';
import { RmMonthlyRecoveryRateApiService } from './rm-monthly-recovery-rate-api.service';
import { MonthlyRecoveryRate } from './rm.models';

const CACHE_KEY = 'rm_monthly_recovery_rate_cache';

@Injectable({ providedIn: 'root' })
export class RmMonthlyRecoveryRateService {
  private readonly rateSubject = new BehaviorSubject<MonthlyRecoveryRate | null>(null);
  readonly rate$ = this.rateSubject.asObservable();
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();
  private readonly offlineSubject = new BehaviorSubject<boolean>(false);
  readonly offline$ = this.offlineSubject.asObservable();
  private ready: Promise<void>;

  constructor(
    private readonly storage: Storage,
    private readonly api: RmMonthlyRecoveryRateApiService,
    private readonly connectivity: ConnectivityService
  ) {
    this.ready = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    await this.storage.create();
    const cached = (await this.storage.get(CACHE_KEY)) as MonthlyRecoveryRate | null;
    if (cached && typeof cached.recoveryRatePercent === 'number') {
      this.rateSubject.next(cached);
    }
  }

  getCurrent(): MonthlyRecoveryRate | null {
    return this.rateSubject.value;
  }

  async load(year?: number, month?: number): Promise<MonthlyRecoveryRate | null> {
    await this.ready;
    this.loadingSubject.next(true);
    try {
      const reachable = await this.connectivity.checkBackendReachable();
      if (!reachable) {
        this.offlineSubject.next(true);
        return this.rateSubject.value;
      }
      this.offlineSubject.next(false);
      const rate = await this.api.getMonthlyRecoveryRate(year, month);
      await this.storage.set(CACHE_KEY, rate);
      this.rateSubject.next(rate);
      return rate;
    } catch {
      this.offlineSubject.next(true);
      return this.rateSubject.value;
    } finally {
      this.loadingSubject.next(false);
    }
  }
}
