import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { AppUpdateNative } from '../plugins/app-update.plugin';
import {
  ApiResponse,
  AppUpdateProgress,
  MobileAppReleaseInfo,
} from 'src/app/models/mobile-app-release.model';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly releaseApiUrl = `${environment.apiUrl}/api/v1/mobile/app/release`;
  private downloadTask: Promise<void> | null = null;
  private sessionChecked = false;
  private silentRetries = 0;
  private sessionGeneration = 0;
  private readonly progressListeners = new Set<(progress: AppUpdateProgress) => void>();

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly toastController: ToastController,
  ) {}

  /**
   * Après une connexion (ou la reprise d'une session), vérifie une version plus récente
   * sans bloquer l'écran. Le téléchargement part seul, puis l'installation Android s'ouvre.
   */
  startAfterLogin(): void {
    if (Capacitor.getPlatform() === 'web' || this.sessionChecked || this.downloadTask) {
      return;
    }
    this.sessionChecked = true;
    void this.runSilentUpdate();
  }

  /** Autorise un nouveau contrôle au prochain login. */
  resetSession(): void {
    this.sessionChecked = false;
    this.silentRetries = 0;
    this.sessionGeneration++;
  }

  isDownloadRunning(): boolean {
    return this.downloadTask != null;
  }

  /**
   * Si un téléchargement est déjà lancé, suit sa progression et se termine avec lui.
   * Sinon retourne null pour laisser le parcours manuel démarrer.
   */
  joinDownload(onProgress?: (progress: AppUpdateProgress) => void): Promise<void> | null {
    if (!this.downloadTask) {
      return null;
    }
    return this.attach(this.downloadTask, onProgress);
  }

  async getLocalVersionCode(): Promise<number> {
    if (Capacitor.getPlatform() === 'web') {
      return this.parseVersionCode(environment.version);
    }
    const info = await App.getInfo();
    const build = Number.parseInt(info.build, 10);
    return Number.isFinite(build) && build > 0 ? build : this.parseVersionCode(info.version);
  }

  async checkForUpdate(): Promise<MobileAppReleaseInfo> {
    const versionCode = await this.getLocalVersionCode();
    const params = new HttpParams().set('versionCode', versionCode.toString());
    const response = await firstValueFrom(
      this.http.get<ApiResponse<MobileAppReleaseInfo>>(`${this.releaseApiUrl}/latest`, { params }),
    );
    return response.data;
  }

  async downloadAndInstall(
    release: MobileAppReleaseInfo,
    onProgress?: (progress: AppUpdateProgress) => void,
  ): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      throw new Error('La mise à jour in-app est disponible uniquement sur Android.');
    }

    if (this.downloadTask) {
      return this.attach(this.downloadTask, onProgress);
    }

    const task = this.executeDownload(release, onProgress);
    this.downloadTask = task.finally(() => {
      this.downloadTask = null;
    });
    return this.downloadTask;
  }

  private async executeDownload(
    release: MobileAppReleaseInfo,
    onProgress?: (progress: AppUpdateProgress) => void,
  ): Promise<void> {
    const report = (progress: AppUpdateProgress) => {
      onProgress?.(progress);
      this.progressListeners.forEach((listener) => listener(progress));
    };

    report({ phase: 'downloading', percent: 0 });

    const token = this.authService.currentUser?.accessToken;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const apkFileName = `elykia-update-v${release.version}.apk`;
    let progressListener: { remove: () => Promise<void> } | undefined;

    try {
      progressListener = await Filesystem.addListener('progress', (event) => {
        if (event.url?.includes('/mobile/app/release/download')) {
          const percent = event.contentLength > 0
            ? Math.round((event.bytes / event.contentLength) * 100)
            : undefined;
          report({ phase: 'downloading', percent });
        }
      });

      const downloadResult = await Filesystem.downloadFile({
        url: `${this.releaseApiUrl}/download`,
        path: apkFileName,
        directory: Directory.Cache,
        headers,
        progress: true,
      });

      report({ phase: 'verifying' });

      const filePath = downloadResult.path ?? apkFileName;
      const verifyResult = await AppUpdateNative.verifyFileSha256({
        filePath,
        sha256: release.sha256,
      });

      if (!verifyResult.valid) {
        await this.safeDelete(filePath);
        throw new Error('Le fichier téléchargé est invalide (empreinte SHA-256 incorrecte).');
      }

      report({ phase: 'installing' });
      await AppUpdateNative.installApk({ filePath });
    } finally {
      await progressListener?.remove();
    }
  }

  private async runSilentUpdate(): Promise<void> {
    const generation = this.sessionGeneration;
    let announced = false;
    try {
      const release = await this.checkForUpdate();
      if (!release?.updateAvailable || generation !== this.sessionGeneration) {
        return;
      }
      announced = true;
      await this.presentToast('Une nouvelle version est disponible. Téléchargement en cours.', 'primary');
      await this.downloadAndInstall(release);
      if (generation !== this.sessionGeneration) {
        return;
      }
      await this.presentToast(
        'Installation lancée. Suivez les instructions Android pour terminer la mise à jour.',
        'success',
      );
    } catch (error) {
      if (generation !== this.sessionGeneration) {
        return;
      }
      this.sessionChecked = false;
      if (!announced && this.silentRetries < 1) {
        this.silentRetries++;
        setTimeout(() => {
          if (generation === this.sessionGeneration) {
            this.startAfterLogin();
          }
        }, 20000);
      }
      if (announced) {
        const message = error instanceof Error ? error.message : 'La mise à jour n’a pas pu être téléchargée.';
        await this.presentToast(message, 'danger');
      }
      console.error('Silent app update error:', error);
    }
  }

  private attach(
    task: Promise<void>,
    onProgress?: (progress: AppUpdateProgress) => void,
  ): Promise<void> {
    if (!onProgress) {
      return task;
    }
    this.progressListeners.add(onProgress);
    return task.finally(() => {
      this.progressListeners.delete(onProgress);
    });
  }

  private async presentToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3500,
      color,
      position: 'top',
    });
    await toast.present();
  }

  private parseVersionCode(version: string): number {
    const normalized = version.split('.M')[0];
    const [major, minor, patch] = normalized.split('.').map((part) => Number.parseInt(part, 10));
    if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) {
      return 0;
    }
    return major * 10000 + minor * 100 + patch;
  }

  private async safeDelete(filePath: string): Promise<void> {
    try {
      await Filesystem.deleteFile({ path: filePath, directory: Directory.Cache });
    } catch {
      // ignore cleanup errors
    }
  }
}
