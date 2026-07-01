import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

export interface FilesystemPermissionResult {
  granted: boolean;
  deniedAfterRequest: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FilesystemPermissionService {

  /**
   * Vérifie et demande l'accès au stockage public (Documents / ExternalStorage) sur Android.
   * Requis pour sauvegardes, logs et photos.
   */
  async ensurePublicStorageAccess(): Promise<FilesystemPermissionResult> {
    if (!Capacitor.isNativePlatform()) {
      return { granted: true, deniedAfterRequest: false };
    }

    let permissions = await Filesystem.checkPermissions();
    if (permissions.publicStorage === 'granted') {
      return { granted: true, deniedAfterRequest: false };
    }

    permissions = await Filesystem.requestPermissions();
    const granted = permissions.publicStorage === 'granted';

    return {
      granted,
      deniedAfterRequest: !granted,
    };
  }
}
