import { registerPlugin } from '@capacitor/core';

export interface DeviceSettingsPlugin {
  /** Paramètres de l'application (autorisations Android). */
  openAppSettings(): Promise<void>;
  /** Paramètres de localisation du téléphone (GPS). */
  openLocationSettings(): Promise<void>;
}

export const DeviceSettings = registerPlugin<DeviceSettingsPlugin>('DeviceSettings');
