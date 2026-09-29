import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { getAnalytics, logEvent, setUserId, Analytics } from 'firebase/analytics';
import { environment } from '../../../environments/environment';
import { getSharedFirebaseApp } from './firebase-app';

/**
 * Analytics Firebase : plugin Capacitor en natif, SDK web sinon.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsReporterService {
  private webAnalytics: Analytics | null = null;
  private ready = false;

  async init(): Promise<void> {
    if (environment.telemetryEnabled === false) {
      return;
    }
    try {
      if (Capacitor.isNativePlatform()) {
        await FirebaseAnalytics.setEnabled({ enabled: true });
        this.ready = true;
        return;
      }
      const app = getSharedFirebaseApp();
      if (!app || !environment.firebase?.measurementId) {
        return;
      }
      this.webAnalytics = getAnalytics(app);
      this.ready = true;
    } catch (error) {
      console.warn('[Analytics] init failed', error);
    }
  }

  async setUserId(userId: string | null): Promise<void> {
    if (!this.ready) {
      return;
    }
    try {
      if (Capacitor.isNativePlatform()) {
        await FirebaseAnalytics.setUserId({ userId: userId ?? null });
        return;
      }
      if (this.webAnalytics) {
        setUserId(this.webAnalytics, userId);
      }
    } catch (error) {
      console.warn('[Analytics] setUserId failed', error);
    }
  }

  async logEvent(name: string, params?: Record<string, string | number | boolean>): Promise<void> {
    if (!this.ready) {
      return;
    }
    const safeName = name.slice(0, 40).replace(/[^a-zA-Z0-9_]/g, '_');
    try {
      if (Capacitor.isNativePlatform()) {
        await FirebaseAnalytics.logEvent({ name: safeName, params });
        return;
      }
      if (this.webAnalytics) {
        logEvent(this.webAnalytics, safeName, params);
      }
    } catch {
      // ignore
    }
  }

  async logScreenView(screenName: string): Promise<void> {
    await this.logEvent('screen_view', {
      firebase_screen: screenName.slice(0, 100),
      firebase_screen_class: screenName.slice(0, 100),
    });
  }
}
