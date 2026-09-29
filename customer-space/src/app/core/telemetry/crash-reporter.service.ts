import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { environment } from '../../../environments/environment';

/**
 * Bridge Crashlytics natif (APK). No-op sur le web.
 */
@Injectable({ providedIn: 'root' })
export class CrashReporterService {
  private enabled = false;

  async init(): Promise<void> {
    if (!this.isNative() || environment.telemetryEnabled === false) {
      return;
    }
    try {
      await FirebaseCrashlytics.setEnabled({ enabled: true });
      this.enabled = true;
    } catch (error) {
      console.warn('[Crashlytics] setEnabled failed', error);
    }
  }

  async setUserId(userId: string | null): Promise<void> {
    if (!this.enabled || !this.isNative()) {
      return;
    }
    try {
      if (userId) {
        await FirebaseCrashlytics.setUserId({ userId });
      }
    } catch (error) {
      console.warn('[Crashlytics] setUserId failed', error);
    }
  }

  async setCustomKey(key: string, value: string | number | boolean): Promise<void> {
    if (!this.enabled || !this.isNative()) {
      return;
    }
    try {
      const type =
        typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'double' : 'string';
      await FirebaseCrashlytics.setCustomKey({ key, value, type });
    } catch (error) {
      console.warn('[Crashlytics] setCustomKey failed', error);
    }
  }

  async log(message: string): Promise<void> {
    if (!this.enabled || !this.isNative()) {
      return;
    }
    try {
      await FirebaseCrashlytics.log({ message: message.slice(0, 1000) });
    } catch {
      // ignore
    }
  }

  async recordException(message: string): Promise<void> {
    if (!this.enabled || !this.isNative()) {
      return;
    }
    try {
      await FirebaseCrashlytics.recordException({ message: message.slice(0, 2000) });
    } catch (error) {
      console.warn('[Crashlytics] recordException failed', error);
    }
  }

  private isNative(): boolean {
    return Capacitor.isNativePlatform();
  }
}
