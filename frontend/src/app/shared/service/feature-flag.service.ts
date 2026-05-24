import { Injectable } from '@angular/core';
import { AngularFireRemoteConfig } from '@angular/fire/compat/remote-config';
import { BehaviorSubject, Observable } from 'rxjs';

export enum FeatureFlags {
  StockReturnHistory = 'stockReturnHistory',
  NextMonthStockCreation = 'nextMonthStockCreation',
  EndOfMonthAlerts = 'endOfMonthAlerts',
  InventoryReconciliationMultiSelect = 'inventoryReconciliationMultiSelect',
}

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

  constructor(private readonly remoteConfig: AngularFireRemoteConfig) {}

  public async init(): Promise<void> {
    try {
      await this.remoteConfig.fetchAndActivate();
      const updatedFlags = { ...this.defaultFlags };
      for (const key of Object.keys(this.defaultFlags)) {
        const value = await this.remoteConfig.getBoolean(key);
        updatedFlags[key] = value;
      }
      this.flagsState.next(updatedFlags);
      console.log('Feature flags updated from Firebase:', updatedFlags);
    } catch (error) {
      console.error('Firebase Remote Config initialization failed. Using default values.', error);
      this.flagsState.next(this.defaultFlags);
    }
  }

  isFeatureEnabled(feature: FeatureFlags): boolean {
    return this.flagsState.value[feature] ?? false;
  }
}
