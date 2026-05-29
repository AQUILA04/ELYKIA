import { Injectable, isDevMode } from '@angular/core';
import { getApp } from 'firebase/app';
import {
  fetchAndActivate,
  getBoolean,
  getRemoteConfig,
  RemoteConfig,
} from 'firebase/remote-config';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export enum FeatureFlags {
  StockReturnHistory = 'stockReturnHistory',
  NextMonthStockCreation = 'nextMonthStockCreation',
  EndOfMonthAlerts = 'endOfMonthAlerts',
  InventoryReconciliationMultiSelect = 'inventoryReconciliationMultiSelect',
}

const REMOTE_CONFIG_FETCH_TIMEOUT_MS = 10_000;
const SKIP_REMOTE_CONFIG_SESSION_KEY = 'elykia.skipRemoteConfig';

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private defaultFlags: Record<string, boolean> = {
    [FeatureFlags.StockReturnHistory]: false,
    [FeatureFlags.NextMonthStockCreation]: false,
    [FeatureFlags.EndOfMonthAlerts]: false,
    [FeatureFlags.InventoryReconciliationMultiSelect]: false,
  };

  private flagsState = new BehaviorSubject<Record<string, boolean>>(this.defaultFlags);
  public flags$: Observable<Record<string, boolean>> = this.flagsState.asObservable();

  private remoteConfig: RemoteConfig | null = null;

  public async init(): Promise<void> {
    if (environment.remoteConfigEnabled === false) {
      this.applyDefaults('Remote Config disabled in environment');
      return;
    }

    if (sessionStorage.getItem(SKIP_REMOTE_CONFIG_SESSION_KEY) === '1') {
      this.applyDefaults('Remote Config skipped (previous fetch failed this session)');
      return;
    }

    try {
      const remoteConfig = this.getRemoteConfigInstance();
      await this.fetchAndActivateWithTimeout(remoteConfig, REMOTE_CONFIG_FETCH_TIMEOUT_MS);

      const updatedFlags = { ...this.defaultFlags };
      for (const key of Object.keys(this.defaultFlags)) {
        updatedFlags[key] = getBoolean(remoteConfig, key);
      }

      this.flagsState.next(updatedFlags);
      console.log('Feature flags updated from Firebase:', updatedFlags);
    } catch (error) {
      sessionStorage.setItem(SKIP_REMOTE_CONFIG_SESSION_KEY, '1');
      const message = this.describeFetchError(error);
      if (isDevMode()) {
        console.warn(
          `Firebase Remote Config unavailable (${message}). Using default values. ` +
            'If this persists: allow firebaseremoteconfig.googleapis.com (ad blocker), and add ' +
            'http://localhost:* to your Firebase API key HTTP referrer restrictions in Google Cloud Console.',
          error
        );
      } else {
        console.error('Firebase Remote Config initialization failed. Using default values.', error);
      }
      this.applyDefaults(message);
    }
  }

  isFeatureEnabled(feature: FeatureFlags): boolean {
    return this.flagsState.value[feature] ?? false;
  }

  private getRemoteConfigInstance(): RemoteConfig {
    if (!this.remoteConfig) {
      this.remoteConfig = getRemoteConfig(getApp());
      this.remoteConfig.defaultConfig = { ...this.defaultFlags };
      this.remoteConfig.settings.minimumFetchIntervalMillis = isDevMode() ? 0 : 3_600_000;
    }
    return this.remoteConfig;
  }

  private fetchAndActivateWithTimeout(
    remoteConfig: RemoteConfig,
    timeoutMs: number
  ): Promise<boolean> {
    return Promise.race([
      fetchAndActivate(remoteConfig),
      new Promise<boolean>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Remote Config fetch timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  }

  private applyDefaults(reason: string): void {
    this.flagsState.next({ ...this.defaultFlags });
    if (isDevMode()) {
      console.debug('Feature flags using defaults:', this.defaultFlags, `(${reason})`);
    }
  }

  private describeFetchError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
