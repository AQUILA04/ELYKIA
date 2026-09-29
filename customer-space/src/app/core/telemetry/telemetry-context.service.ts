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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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
