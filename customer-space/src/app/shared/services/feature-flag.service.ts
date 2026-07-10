import { Injectable, isDevMode } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  fetchAndActivate,
  getBoolean,
  getRemoteConfig,
  RemoteConfig,
} from 'firebase/remote-config';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { isE2eMode } from '../utils/e2e';

export enum FeatureFlags {
  CustomerSpaceAvailable = 'customerSpaceAvailable',
}

const REMOTE_CONFIG_FETCH_TIMEOUT_MS = 10_000;
const SKIP_REMOTE_CONFIG_SESSION_KEY = 'elykia.customerSpace.skipRemoteConfig';

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly defaultFlags: Record<string, boolean> = {
    [FeatureFlags.CustomerSpaceAvailable]: true,
  };

  private flagsState = new BehaviorSubject<Record<string, boolean>>(this.defaultFlags);
  readonly flags$: Observable<Record<string, boolean>> = this.flagsState.asObservable();

  private remoteConfig: RemoteConfig | null = null;
  private initPromise: Promise<void> | null = null;

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.loadFlags('init');
    }
    return this.initPromise;
  }

  /** Rafraîchit les flags (ex. à la soumission du téléphone sur la page connexion). */
  async refresh(): Promise<void> {
    await this.loadFlags('refresh');
  }

  isFeatureEnabled(feature: FeatureFlags): boolean {
    const e2eOverride = this.getE2eOverride(feature);
    if (e2eOverride !== undefined) {
      return e2eOverride;
    }
    return this.flagsState.value[feature] ?? this.defaultFlags[feature] ?? false;
  }

  isCustomerSpaceAvailable(): boolean {
    return this.isFeatureEnabled(FeatureFlags.CustomerSpaceAvailable);
  }

  private async loadFlags(reason: 'init' | 'refresh'): Promise<void> {
    const e2eOverride = this.getE2eOverride(FeatureFlags.CustomerSpaceAvailable);
    if (e2eOverride !== undefined) {
      this.flagsState.next({
        ...this.defaultFlags,
        [FeatureFlags.CustomerSpaceAvailable]: e2eOverride,
      });
      return;
    }

    if (environment.remoteConfigEnabled === false) {
      this.applyDefaults(`Remote Config disabled (${reason})`);
      return;
    }

    if (reason === 'init' && sessionStorage.getItem(SKIP_REMOTE_CONFIG_SESSION_KEY) === '1') {
      this.applyDefaults(`Remote Config skipped (${reason})`);
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
    } catch (error) {
      if (reason === 'init') {
        sessionStorage.setItem(SKIP_REMOTE_CONFIG_SESSION_KEY, '1');
      }
      if (isDevMode()) {
        console.warn('Firebase Remote Config unavailable. Using default feature flags.', error);
      } else {
        console.error('Firebase Remote Config failed. Using default feature flags.', error);
      }
      this.applyDefaults(this.describeFetchError(error));
    }
  }

  private getE2eOverride(feature: FeatureFlags): boolean | undefined {
    if (!isE2eMode() || typeof window === 'undefined') {
      return undefined;
    }
    const flags = (window as Window & { __E2E_FLAGS__?: Record<string, boolean> }).__E2E_FLAGS__;
    if (!flags || !(feature in flags)) {
      return undefined;
    }
    return flags[feature];
  }

  private getFirebaseApp() {
    if (getApps().length === 0) {
      if (!environment.firebase?.apiKey) {
        throw new Error('Firebase configuration is missing');
      }
      initializeApp(environment.firebase);
    }
    return getApp();
  }

  private getRemoteConfigInstance(): RemoteConfig {
    if (!this.remoteConfig) {
      this.remoteConfig = getRemoteConfig(this.getFirebaseApp());
      this.remoteConfig.defaultConfig = { ...this.defaultFlags };
      this.remoteConfig.settings.minimumFetchIntervalMillis = isDevMode() ? 0 : 3_600_000;
    }
    return this.remoteConfig;
  }

  private fetchAndActivateWithTimeout(
    remoteConfig: RemoteConfig,
    timeoutMs: number,
  ): Promise<boolean> {
    return Promise.race([
      fetchAndActivate(remoteConfig),
      new Promise<boolean>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Remote Config fetch timed out after ${timeoutMs}ms`)),
          timeoutMs,
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
