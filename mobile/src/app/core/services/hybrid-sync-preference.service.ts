import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

export type AutoSyncIntervalMinutes = 30 | 60 | 120 | 240;

export const AUTO_SYNC_INTERVAL_OPTIONS: { value: AutoSyncIntervalMinutes; label: string }[] = [
  { value: 30, label: 'Toutes les 30 minutes' },
  { value: 60, label: 'Toutes les heures' },
  { value: 120, label: 'Toutes les 2 heures' },
  { value: 240, label: 'Toutes les 4 heures' },
];

@Injectable({
  providedIn: 'root'
})
export class HybridSyncPreferenceService {
  private readonly hybridEnabledKey = 'hybridSyncEnabled';
  private readonly autoSyncKey = 'autoSync';
  private readonly autoSyncIntervalKey = 'autoSyncIntervalMinutes';

  constructor(private readonly storage: Storage) {}

  async isHybridSyncEnabled(): Promise<boolean> {
    const value = await this.storage.get(this.hybridEnabledKey);
    return value !== false;
  }

  async setHybridSyncEnabled(enabled: boolean): Promise<void> {
    await this.storage.set(this.hybridEnabledKey, enabled);
  }

  async getAutoSyncEnabled(): Promise<boolean> {
    return (await this.storage.get(this.autoSyncKey)) === true;
  }

  async setAutoSyncEnabled(enabled: boolean): Promise<void> {
    await this.storage.set(this.autoSyncKey, enabled);
  }

  async getAutoSyncIntervalMinutes(): Promise<AutoSyncIntervalMinutes> {
    const stored = await this.storage.get(this.autoSyncIntervalKey);
    const allowed = AUTO_SYNC_INTERVAL_OPTIONS.map((o) => o.value);
    if (allowed.includes(stored)) {
      return stored;
    }
    return 120;
  }

  async setAutoSyncIntervalMinutes(minutes: AutoSyncIntervalMinutes): Promise<void> {
    await this.storage.set(this.autoSyncIntervalKey, minutes);
  }

  getAutoSyncIntervalLabel(minutes: AutoSyncIntervalMinutes): string {
    return AUTO_SYNC_INTERVAL_OPTIONS.find((o) => o.value === minutes)?.label ?? `Toutes les ${minutes} minutes`;
  }
}
