// src/app/core/services/feature-flag.service.ts
import { Injectable } from '@angular/core';
import { FirebaseRemoteConfig } from '@capacitor-firebase/remote-config';
import { BehaviorSubject } from 'rxjs';

// Énumération pour centraliser les noms des flags
export enum FeatureFlags {
  QuickActionStock = 'quickActionStock',
  VersementHistory = 'versementHistory',
  ReliquatManagement = 'reliquatManagement',
}

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  // Valeurs par défaut locales
  private defaultFlags: Record<string, boolean> = {
    [FeatureFlags.QuickActionStock]: false,
    [FeatureFlags.VersementHistory]: false,
    [FeatureFlags.ReliquatManagement]: false,
  };

  private flagsState = new BehaviorSubject<Record<string, boolean>>(this.defaultFlags);
  public flags$ = this.flagsState.asObservable();

  constructor() {}

  /**
   * Initialise le service Remote Config.
   */
  public async init(): Promise<void> {
    try {
      // Set the minimum fetch interval. The plugin's runtime may expect milliseconds,
      // but the exact property name can vary between versions. Cast to `any` to avoid
      // strict typing issues while keeping the intended units (ms) documented.
      await FirebaseRemoteConfig.setMinimumFetchInterval({ minimumFetchIntervalMillis: 3600 * 1000 } as any);

      // Récupérer et activer les dernières valeurs depuis Firebase
      await FirebaseRemoteConfig.fetchAndActivate();

      const updatedFlags = { ...this.defaultFlags };
      const flagKeys = Object.keys(this.defaultFlags);

      // Correction: Itérer sur nos clés connues au lieu d'appeler 'getKeys'
      for (const key of flagKeys) {
        const { value } = await FirebaseRemoteConfig.getBoolean({ key });
        updatedFlags[key] = value;
      }

      this.flagsState.next(updatedFlags);
      console.log('Feature flags updated from Firebase:', updatedFlags);

    } catch (error) {
      console.error('Firebase Remote Config initialization failed. Using default values.', error);
      // En cas d'erreur, les valeurs par défaut sont déjà dans le state.
      this.flagsState.next(this.defaultFlags);
    }
  }

  /**
   * Vérifie si une fonctionnalité est activée (utilisation synchrone).
   */
  isFeatureEnabled(feature: FeatureFlags): boolean {
    return this.flagsState.value[feature] ?? false;
  }
}
