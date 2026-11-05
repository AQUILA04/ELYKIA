import { AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { AppUpdateProgress, MobileAppReleaseInfo } from 'src/app/models/mobile-app-release.model';
import { AppUpdateService } from './app-update.service';

export interface ManualAppUpdateHost {
  appVersion: string;
  notify(message: string, color: string): Promise<void>;
  onState(busy: boolean, label: string): void;
}

export function formatAppUpdateProgress(progress: AppUpdateProgress): string {
  switch (progress.phase) {
    case 'downloading':
      return progress.percent != null
        ? `Téléchargement... ${progress.percent}%`
        : 'Téléchargement en cours...';
    case 'verifying':
      return 'Vérification du fichier...';
    case 'installing':
      return 'Lancement de l\'installation...';
    default:
      return 'Mise à jour en cours...';
  }
}

export async function runManualAppUpdate(
  updates: AppUpdateService,
  alerts: AlertController,
  host: ManualAppUpdateHost
): Promise<void> {
  const running = updates.joinDownload((progress) => host.onState(true, formatAppUpdateProgress(progress)));
  if (running) {
    host.onState(true, 'Téléchargement en cours...');
    try {
      await running;
    } catch {
      // Le message d'échec est déjà affiché par le téléchargement en cours.
    } finally {
      host.onState(false, '');
    }
    return;
  }

  if (Capacitor.getPlatform() === 'web') {
    await host.notify('La mise à jour in-app est disponible uniquement sur l\'application Android.', 'warning');
    return;
  }

  host.onState(true, 'Vérification de la version...');
  try {
    const release = await updates.checkForUpdate();
    if (!release.updateAvailable) {
      await host.notify('Votre application est déjà à jour.', 'success');
      return;
    }
    const confirmed = await confirmAppUpdate(alerts, release, host.appVersion);
    if (!confirmed) {
      return;
    }
    await updates.downloadAndInstall(release, (progress) => host.onState(true, formatAppUpdateProgress(progress)));
    await host.notify('Installation lancée. Suivez les instructions Android pour terminer la mise à jour.', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de mettre à jour l\'application.';
    await host.notify(message, 'danger');
    console.error('App update error:', error);
  } finally {
    host.onState(false, '');
  }
}

async function confirmAppUpdate(
  alerts: AlertController,
  release: MobileAppReleaseInfo,
  appVersion: string
): Promise<boolean> {
  const sizeMb = release.sizeBytes > 0 ? (release.sizeBytes / (1024 * 1024)).toFixed(1) : null;
  const sizeLine = sizeMb ? `\n\nTaille : ${sizeMb} Mo` : '';
  const notes = release.releaseNotes?.trim() ? `\n\n${release.releaseNotes.trim()}` : '';
  const mandatory = release.updateRequired || release.mandatory;
  const mandatoryLine = mandatory ? '\n\nCette mise à jour est obligatoire.' : '';

  return new Promise<boolean>((resolve) => {
    alerts.create({
      header: 'Mise à jour disponible',
      message: `Version ${release.version} disponible (vous êtes en ${appVersion}).${sizeLine}${notes}${mandatoryLine}`,
      buttons: [
        {
          text: mandatory ? 'Plus tard' : 'Annuler',
          role: 'cancel',
          handler: () => resolve(false),
        },
        {
          text: 'Mettre à jour',
          handler: () => resolve(true),
        },
      ],
    }).then((alert) => alert.present());
  });
}
