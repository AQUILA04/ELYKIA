import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { environment } from '../../../environments/environment';
import { CustomerSessionService } from './customer-session.service';
import { AppUpdateNative } from '../plugins/app-update.plugin';
import {
  ApiResponse,
  AppReleaseInfo,
  AppUpdateProgress,
} from '../models/app-release.model';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly releaseApiUrl = `${environment.apiUrl}/api/v1/customer/app/release`;

  constructor(
    private readonly http: HttpClient,
    private readonly session: CustomerSessionService,
  ) {}

  async getLocalVersionCode(): Promise<number> {
    if (Capacitor.getPlatform() === 'web') {
      return this.parseVersionCode(environment.version);
    }
    const info = await App.getInfo();
    const build = Number.parseInt(info.build, 10);
    return Number.isFinite(build) && build > 0 ? build : this.parseVersionCode(info.version);
  }

  async checkForUpdate(): Promise<AppReleaseInfo> {
    const versionCode = await this.getLocalVersionCode();
    const params = new HttpParams().set('versionCode', versionCode.toString());
    const response = await firstValueFrom(
      this.http.get<ApiResponse<AppReleaseInfo>>(`${this.releaseApiUrl}/latest`, { params }),
    );
    return response.data;
  }

  async downloadAndInstall(
    release: AppReleaseInfo,
    onProgress?: (progress: AppUpdateProgress) => void,
  ): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      throw new Error('La mise à jour in-app est disponible uniquement sur Android.');
    }

    onProgress?.({ phase: 'downloading', percent: 0 });

    const token = this.session.currentSession?.token;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const apkFileName = `elykia-customer-update-v${release.version}.apk`;
    let progressListener: { remove: () => Promise<void> } | undefined;
    let filePath: string | undefined;
    let installLaunched = false;

    try {
      progressListener = await Filesystem.addListener('progress', (event) => {
        if (event.url?.includes('/customer/app/release/download')) {
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

      const cachePath = downloadResult.path ?? apkFileName;
      filePath = cachePath;
      const nativeFilePath = await this.resolveNativeFilePath(cachePath);
      const verifyResult = await AppUpdateNative.verifyFileSha256({
        filePath: nativeFilePath,
        sha256: release.sha256,
      });

      if (!verifyResult.valid) {
        throw new Error('Le fichier téléchargé est invalide (empreinte SHA-256 incorrecte).');
      }

      onProgress?.({ phase: 'installing' });
      await AppUpdateNative.installApk({ filePath: nativeFilePath });
      installLaunched = true;
    } catch (error) {
      if (filePath && !installLaunched) {
        await this.safeDelete(filePath);
      }
      throw error;
    } finally {
      await progressListener?.remove();
    }
  }

  parseVersionCode(version: string): number {
    const normalized = version.split('.M')[0];
    const [major, minor, patch] = normalized.split('.').map((part) => Number.parseInt(part, 10));
    if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) {
      return 0;
    }
    return major * 10000 + minor * 100 + patch;
  }

  /** Convertit l'URI Capacitor (file://…) en chemin absolu lisible par le plugin Android. */
  filesystemUriToNativePath(uri: string): string {
    if (!uri.startsWith('file://')) {
      return uri;
    }
    return decodeURIComponent(uri.replace(/^file:\/\//, ''));
  }

  private async resolveNativeFilePath(cachePath: string): Promise<string> {
    const { uri } = await Filesystem.getUri({
      path: cachePath,
      directory: Directory.Cache,
    });
    return this.filesystemUriToNativePath(uri);
  }

  private async safeDelete(cachePath: string): Promise<void> {
    try {
      await Filesystem.deleteFile({ path: cachePath, directory: Directory.Cache });
    } catch {
      // ignore cleanup errors
    }
  }
}
