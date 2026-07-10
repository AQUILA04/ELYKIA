import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { AppUpdateService } from '../../shared/services/app-update.service';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';
import { environment } from '../../../environments/environment';
import { AppReleaseInfo } from '../../shared/models/app-release.model';

/** Page Profil Client. */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CustomerTabBarComponent],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage {
  session = this.sessionService.currentSession;
  appVersion = environment.version;
  updateInProgress = false;
  updateProgressLabel = '';

  constructor(
    private sessionService: CustomerSessionService,
    private router: Router,
    private appUpdateService: AppUpdateService,
    private alertController: AlertController,
    private toastController: ToastController,
  ) {}

  logout(): void {
    this.sessionService.clearSession();
    void this.router.navigate(['/auth'], { replaceUrl: true });
  }

  async checkForAppUpdate(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      await this.presentToast('La mise à jour in-app est disponible uniquement sur l\'application Android.', 'warning');
      return;
    }

    this.updateInProgress = true;
    this.updateProgressLabel = 'Vérification de la version...';

    try {
      const release = await this.appUpdateService.checkForUpdate();
      if (!release.updateAvailable) {
        await this.presentToast('Votre application est déjà à jour.', 'success');
        return;
      }

      const confirmed = await this.confirmAppUpdate(release);
      if (!confirmed) {
        return;
      }

      await this.runAppUpdate(release);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de mettre à jour l\'application.';
      await this.presentToast(message, 'danger');
    } finally {
      this.updateInProgress = false;
      this.updateProgressLabel = '';
    }
  }

  private async runAppUpdate(release: AppReleaseInfo): Promise<void> {
    await this.appUpdateService.downloadAndInstall(release, (progress) => {
      switch (progress.phase) {
        case 'downloading':
          this.updateProgressLabel = progress.percent != null
            ? `Téléchargement... ${progress.percent}%`
            : 'Téléchargement en cours...';
          break;
        case 'verifying':
          this.updateProgressLabel = 'Vérification du fichier...';
          break;
        case 'installing':
          this.updateProgressLabel = 'Lancement de l\'installation...';
          break;
        default:
          this.updateProgressLabel = 'Mise à jour en cours...';
      }
    });

    await this.presentToast(
      'Installation lancée. Suivez les instructions Android pour terminer la mise à jour.',
      'success',
    );
  }

  private async confirmAppUpdate(release: AppReleaseInfo): Promise<boolean> {
    const sizeMb = release.sizeBytes > 0
      ? (release.sizeBytes / (1024 * 1024)).toFixed(1)
      : null;
    const sizeLine = sizeMb ? `\n\nTaille : ${sizeMb} Mo` : '';
    const notes = release.releaseNotes?.trim()
      ? `\n\n${release.releaseNotes.trim()}`
      : '';
    const mandatory = release.updateRequired || release.mandatory;

    return new Promise<boolean>((resolve) => {
      void this.alertController.create({
        header: mandatory ? 'Mise à jour obligatoire' : 'Mise à jour disponible',
        message: `Version ${release.version} disponible (vous êtes en ${this.appVersion}).${sizeLine}${notes}`,
        backdropDismiss: !mandatory,
        buttons: mandatory
          ? [{ text: 'Mettre à jour', handler: () => resolve(true) }]
          : [
              { text: 'Annuler', role: 'cancel', handler: () => resolve(false) },
              { text: 'Mettre à jour', handler: () => resolve(true) },
            ],
      }).then((alert) => alert.present());
    });
  }

  private async presentToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2500, color });
    await toast.present();
  }
}
