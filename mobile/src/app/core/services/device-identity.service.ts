import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';

export interface DeviceIdentity {
  deviceId: string;
  deviceLabel: string;
  platform: string;
  model: string;
  appVersion: string;
}

const INSTALLATION_ID_KEY = 'elykia_installation_id';

@Injectable({
  providedIn: 'root',
})
export class DeviceIdentityService {
  private cachedDeviceId: string | null = null;

  async getDeviceIdentity(): Promise<DeviceIdentity> {
    const deviceId = await this.getOrCreateDeviceId();
    let platform = Capacitor.getPlatform();
    let model = 'unknown';
    let deviceLabel = platform;

    try {
      const info = await Device.getInfo();
      platform = info.platform || platform;
      model = info.model || model;
      const manufacturer = info.manufacturer?.trim();
      deviceLabel = [manufacturer, model].filter(Boolean).join(' ').trim() || deviceLabel;
    } catch {
      // Fallback when Device plugin is unavailable (e.g. web tests).
    }

    return {
      deviceId,
      deviceLabel,
      platform,
      model,
      appVersion: environment.version,
    };
  }

  getCachedDeviceId(): string | null {
    return this.cachedDeviceId;
  }

  private async getOrCreateDeviceId(): Promise<string> {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const { identifier } = await Device.getId();
        if (identifier) {
          this.cachedDeviceId = identifier;
          return identifier;
        }
      } catch {
        // Fall through to installation id.
      }
    }

    const { value } = await Preferences.get({ key: INSTALLATION_ID_KEY });
    if (value) {
      this.cachedDeviceId = value;
      return value;
    }

    const installationId = crypto.randomUUID();
    await Preferences.set({ key: INSTALLATION_ID_KEY, value: installationId });
    this.cachedDeviceId = installationId;
    return installationId;
  }
}
