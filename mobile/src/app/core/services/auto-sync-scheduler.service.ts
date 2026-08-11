import { Injectable, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Subscription, firstValueFrom, from, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { ConnectivityService } from './connectivity.service';
import { HybridSyncPreferenceService } from './hybrid-sync-preference.service';
import { LoggerService } from './logger.service';
import * as SyncActions from '../../store/sync/sync.actions';
import { selectAutomaticSyncIsActive } from '../../store/sync/sync.selectors';

@Injectable({
  providedIn: 'root'
})
export class AutoSyncSchedulerService implements OnDestroy {
  private schedulerSub?: Subscription;
  private platformSub?: Subscription;
  private appActive = true;
  private initialized = false;

  constructor(
    private readonly platform: Platform,
    private readonly store: Store,
    private readonly connectivityService: ConnectivityService,
    private readonly hybridSyncPreferenceService: HybridSyncPreferenceService,
    private readonly log: LoggerService
  ) {}

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.platformSub = this.platform.pause?.subscribe(() => {
      this.appActive = false;
      this.stopScheduler();
    });

    this.platform.resume?.subscribe(async () => {
      this.appActive = true;
      this.connectivityService.invalidateCache();
      await this.refreshScheduler();
    });

    await this.refreshScheduler();
  }

  async refreshScheduler(): Promise<void> {
    this.stopScheduler();

    if (!this.appActive) {
      return;
    }

    const autoSyncEnabled = await this.hybridSyncPreferenceService.getAutoSyncEnabled();
    if (!autoSyncEnabled) {
      return;
    }

    const intervalMinutes = await this.hybridSyncPreferenceService.getAutoSyncIntervalMinutes();
    const intervalMs = intervalMinutes * 60_000;

    void this.log.log(`[AutoSyncScheduler] Started foreground scheduler (${intervalMinutes} min)`);

    this.schedulerSub = interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => from(this.triggerSyncIfNeeded()))
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.stopScheduler();
    this.platformSub?.unsubscribe();
  }

  private stopScheduler(): void {
    this.schedulerSub?.unsubscribe();
    this.schedulerSub = undefined;
  }

  private async triggerSyncIfNeeded(): Promise<void> {
    if (!this.appActive) {
      return;
    }

    const hybridEnabled = await this.hybridSyncPreferenceService.isHybridSyncEnabled();
    if (!hybridEnabled) {
      return;
    }

    const autoSyncEnabled = await this.hybridSyncPreferenceService.getAutoSyncEnabled();
    if (!autoSyncEnabled) {
      return;
    }

    const reachable = await this.connectivityService.checkBackendReachable();
    if (!reachable) {
      return;
    }

    const syncActive = await firstValueFrom(this.store.select(selectAutomaticSyncIsActive));
    if (syncActive) {
      return;
    }

    void this.log.log('[AutoSyncScheduler] Dispatching automatic sync');
    this.store.dispatch(SyncActions.startAutomaticSync());
  }
}
