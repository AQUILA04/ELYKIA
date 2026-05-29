// src/app/core/services/feature-flag.service.ts
import { Injectable, isDevMode } from '@angular/core';
import { Capacitor } from '@capacitor/core';
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
    if (Capacitor.getPlatform() === 'web') {
      // Remote Config natif nécessite initializeApp() côté web (non configuré) : valeurs locales.
      this.flagsState.next(this.defaultFlags);
      return;
    }

    try {
      // Use setSettings to configure the fetch interval
      await FirebaseRemoteConfig.setSettings({
        minimumFetchIntervalInSeconds: isDevMode() ? 0 : 3600,
      });

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
