import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
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

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

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

    onProgress?.({ phase: 'downloading', percent: 0 });

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
          onProgress?.({ phase: 'downloading', percent });
        }
      });

      const downloadResult = await Filesystem.downloadFile({
        url: `${this.releaseApiUrl}/download`,
        path: apkFileName,
        directory: Directory.Cache,
        headers,
        progress: true,
      });

      onProgress?.({ phase: 'verifying' });

      const filePath = downloadResult.path ?? apkFileName;
      const verifyResult = await AppUpdateNative.verifyFileSha256({
        filePath,
        sha256: release.sha256,
      });

      if (!verifyResult.valid) {
        await this.safeDelete(filePath);
        throw new Error('Le fichier téléchargé est invalide (empreinte SHA-256 incorrecte).');
      }

      onProgress?.({ phase: 'installing' });
      await AppUpdateNative.installApk({ filePath });
    } finally {
      await progressListener?.remove();
    }
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
