import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

@Injectable({ providedIn: 'root' })
export class ExportLocationService {

  /**
   * Ouvre le dossier d'export dans le gestionnaire de fichiers (mobile)
   * ou déclenche le téléchargement du fichier (web).
   */
  async openExportLocation(options: {
    folderPath: string;
    filePath: string;
    directory: Directory;
    fileName: string;
  }): Promise<void> {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      await this.downloadFileOnWeb(options.filePath, options.fileName, options.directory);
      return;
    }

    const folderOpened = await this.tryOpenUri(options.folderPath, options.directory);
    if (folderOpened) {
      return;
    }

    const fileOpened = await this.tryOpenUri(options.filePath, options.directory);
    if (!fileOpened) {
      throw new Error('Impossible d\'ouvrir le dossier d\'export.');
    }
  }

  getHumanReadableFolderPath(relativeFolder: string): string {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      return `Fichiers › Sur mon iPhone › ELYKIA › ${relativeFolder.replace(/\//g, ' › ')}`;
    }
    return `Documents/${relativeFolder.replace(/\//g, '/')}`;
  }

  private async tryOpenUri(path: string, directory: Directory): Promise<boolean> {
    try {
      const { uri } = await Filesystem.getUri({ path, directory });
      this.openUriInSystem(uri);
      return true;
    } catch (error) {
      console.warn(`ExportLocationService: cannot open ${path}`, error);
      return false;
    }
  }

  private openUriInSystem(uri: string): void {
    if (Capacitor.isNativePlatform()) {
      window.open(uri, '_system');
      return;
    }
    window.open(uri, '_blank');
  }

  private async downloadFileOnWeb(
    filePath: string,
    fileName: string,
    directory: Directory
  ): Promise<void> {
    const result = await Filesystem.readFile({ path: filePath, directory });
    const base64Data = result.data as string;
    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
