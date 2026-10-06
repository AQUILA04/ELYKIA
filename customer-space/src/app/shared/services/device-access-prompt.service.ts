import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { DeviceSettings } from '../plugins/device-settings.plugin';
import {
  DEVICE_ACCESS_COPY,
  DeviceAccessPrompter,
  DevicePermissionKind,
  isDeviceAccessDismissed,
  isLocationServicesDisabled,
  permissionKindFromError,
} from '../utils/device-access';

type AlertChoice = 'primary' | 'dismiss';

/** Pont vers le plugin natif, remplaçable dans les tests. */
@Injectable({ providedIn: 'root' })
export class DeviceSettingsGateway {
  openAppSettings(): Promise<void> {
    return DeviceSettings.openAppSettings();
  }

  openLocationSettings(): Promise<void> {
    return DeviceSettings.openLocationSettings();
  }
}

/**
 * Fenêtres d'invitation : autorisation Android refusée, ou GPS du téléphone désactivé.
 */
@Injectable({ providedIn: 'root' })
export class DeviceAccessPromptService implements DeviceAccessPrompter {
  private readonly alertController = inject(AlertController);
  private readonly settings = inject(DeviceSettingsGateway);

  /** true si une fenêtre a été affichée (ne pas recopier le message sur le formulaire). */
  async presentIfNeeded(error: unknown): Promise<boolean> {
    if (isDeviceAccessDismissed(error)) {
      return true;
    }
    const kind = permissionKindFromError(error);
    if (kind) {
      await this.askOpenAppSettings(kind);
      return true;
    }
    if (isLocationServicesDisabled(error)) {
      await this.askEnableGps();
      return true;
    }
    return false;
  }

  confirmPermissionRequest(kind: DevicePermissionKind): Promise<boolean> {
    return this.presentChoice({
      header: 'Autorisation requise',
      message: DEVICE_ACCESS_COPY[kind].request,
      dismissLabel: 'Plus tard',
      primaryLabel: 'Autoriser',
    }).then((choice) => choice === 'primary');
  }

  async askOpenAppSettings(kind: DevicePermissionKind): Promise<void> {
    const choice = await this.presentChoice({
      header: 'Autorisation requise',
      message: DEVICE_ACCESS_COPY[kind].settings,
      dismissLabel: 'Plus tard',
      primaryLabel: Capacitor.getPlatform() === 'web' ? undefined : 'Ouvrir les paramètres',
    });
    if (choice === 'primary') {
      await this.openAppSettings();
    }
  }

  async askEnableGps(): Promise<void> {
    const android = Capacitor.getPlatform() === 'android';
    const choice = await this.presentChoice({
      header: 'Activez le GPS',
      message: android ? DEVICE_ACCESS_COPY.gps.android : DEVICE_ACCESS_COPY.gps.other,
      dismissLabel: android ? 'Plus tard' : 'Compris',
      primaryLabel: android ? 'Activer le GPS' : undefined,
    });
    if (choice === 'primary') {
      await this.openLocationSettings();
    }
  }

  private async openAppSettings(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      return;
    }
    try {
      await this.settings.openAppSettings();
    } catch (error) {
      console.error('[device-access] Ouverture des paramètres application impossible', error);
    }
  }

  private async openLocationSettings(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }
    try {
      await this.settings.openLocationSettings();
    } catch (error) {
      console.error('[device-access] Ouverture des paramètres GPS impossible', error);
    }
  }

  private presentChoice(options: {
    header: string;
    message: string;
    dismissLabel: string;
    primaryLabel?: string;
  }): Promise<AlertChoice> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (choice: AlertChoice) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(choice);
      };
      const buttons: { text: string; role?: string; cssClass?: string; handler: () => void }[] = [
        { text: options.dismissLabel, role: 'cancel', handler: () => finish('dismiss') },
      ];
      if (options.primaryLabel) {
        buttons.push({
          text: options.primaryLabel,
          cssClass: 'elyk-alert-primary',
          handler: () => finish('primary'),
        });
      }
      void this.alertController
        .create({
          header: options.header,
          message: options.message,
          cssClass: 'elyk-device-alert',
          backdropDismiss: true,
          buttons,
        })
        .then((alert) => {
          void alert.onDidDismiss().then(() => finish('dismiss'));
          return alert.present();
        })
        .catch(() => finish('dismiss'));
    });
  }
}
