import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';
import { maskPhone } from './phone-mask';

const DEVICE_ID_KEY = 'elykia_customer_device_id';

@Injectable({ providedIn: 'root' })
export class TelemetryContextService {
  readonly deviceId: string;
  readonly sessionId: string;
  readonly platform: string;
  readonly appVersion: string;

  private clientId: string | null = null;
  private phoneRaw: string | null = null;
  private currentScreen: string | null = null;

  constructor() {
    this.deviceId = this.loadOrCreateDeviceId();
    this.sessionId = this.createUuid();
    this.platform = Capacitor.getPlatform();
    this.appVersion = environment.version;
  }

  setClient(clientId: string | null, phone: string | null): void {
    this.clientId = clientId;
    this.phoneRaw = phone;
  }

  clearClient(): void {
    this.clientId = null;
    this.phoneRaw = null;
  }

  setScreen(screen: string | null): void {
    this.currentScreen = screen;
  }

  getClientId(): string | null {
    return this.clientId;
  }

  /** Téléphone complet — uniquement pour le journal backend. */
  getPhoneRaw(): string | null {
    return this.phoneRaw;
  }

  /** Téléphone masqué — Firebase / Analytics. */
  getPhoneMasked(): string | null {
    return maskPhone(this.phoneRaw);
  }

  getScreen(): string | null {
    return this.currentScreen;
  }

  createUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
      throw new Error('Web Crypto API unavailable');
    }
    // Fallback CSPRNG (UUID v4) — avoid Math.random (Sonar typescript:S2245).
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private loadOrCreateDeviceId(): string {
    try {
      const existing = localStorage.getItem(DEVICE_ID_KEY);
      if (existing) {
        return existing;
      }
      const id = this.createUuid();
      localStorage.setItem(DEVICE_ID_KEY, id);
      return id;
    } catch {
      return this.createUuid();
    }
  }
}
