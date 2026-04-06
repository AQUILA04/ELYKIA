import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import {FirebaseCrashlytics} from "@capacitor-firebase/crashlytics";

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private static inMemoryLogs: string[] = [];
  // Chemin dans le répertoire de données de l'application
  // Utilise un fichier directement dans le répertoire Documents sans sous-dossier
  private logFileName = 'elykia/app_logs.txt';
  private logDirectory = Directory.Documents;

  constructor() {
    this.initializeLogFile();
  }

  private async initializeLogFile() {
    try {
      // Vérifier d'abord si le fichier existe
      const fileExists = await this.checkFileExists();

      if (!fileExists) {
        // Créer le fichier s'il n'existe pas
        await Filesystem.writeFile({
          path: this.logFileName,
          data: `--- Log Initialized at ${new Date().toISOString()} ---\n`,
          directory: this.logDirectory,
          encoding: Encoding.UTF8,
        });
        console.log('✅ Fichier de logs créé avec succès');
      } else {
        // Ajouter une ligne de séparation si le fichier existe déjà
        await Filesystem.appendFile({
          path: this.logFileName,
          data: `\n--- Session Started at ${new Date().toISOString()} ---\n`,
          directory: this.logDirectory,
          encoding: Encoding.UTF8,
        });
        console.log('✅ Session de logs ajoutée au fichier existant');
      }
    } catch (error: any) {
      const errorMessage = `Erreur lors de l'initialisation des logs: ${error.message || error}`;
      LoggerService.inMemoryLogs.push(errorMessage);
      console.error(errorMessage, error);

      // En cas d'erreur, on continue avec les logs en mémoire seulement
      console.warn('⚠️ Logs sauvegardés en mémoire seulement');
    }
  }

  private async checkFileExists(): Promise<boolean> {
    try {
      await Filesystem.stat({
        path: this.logFileName,
        directory: this.logDirectory
      });
      return true;
    } catch (error) {
      // Le fichier n'existe pas
      return false;
    }
  }

  async log(message: string) {
    console.log(message);
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    // Toujours sauvegarder en mémoire
    LoggerService.inMemoryLogs.push(logMessage);

    // Limiter les logs en mémoire pour éviter les fuites mémoire
    if (LoggerService.inMemoryLogs.length > 500) {
      LoggerService.inMemoryLogs.splice(0, LoggerService.inMemoryLogs.length - 500);
    }

    // Essayer de sauvegarder dans le fichier (non-bloquant)
    this.saveToFileAsync(logMessage);
    await FirebaseCrashlytics.log({ message: logMessage });
  }

  async error(message: string, error?: any) {
      const errorMessage = error ? `${message}: ${JSON.stringify(error)}` : message;
      console.error(errorMessage);
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ERROR: ${errorMessage}\n`;

      LoggerService.inMemoryLogs.push(logMessage);
      this.saveToFileAsync(logMessage);
  }

  private async saveToFileAsync(logMessage: string) {
    try {
      await Filesystem.appendFile({
        path: this.logFileName,
        data: logMessage,
        directory: this.logDirectory,
        encoding: Encoding.UTF8,
      });
    } catch (error: any) {
      // Si l'écriture échoue, essayer de recréer le fichier
      try {
        await Filesystem.writeFile({
          path: this.logFileName,
          data: `--- Log File Recreated at ${new Date().toISOString()} ---\n${logMessage}`,
          directory: this.logDirectory,
          encoding: Encoding.UTF8,
        });
        console.log('🔄 Fichier de logs recréé après erreur');
      } catch (recreateError: any) {
        // Si même la recréation échoue, on continue avec les logs en mémoire seulement
        const errorMessage = `Impossible d'écrire les logs sur disque: ${recreateError.message || recreateError}`;
        console.warn(errorMessage);

        // Ajouter l'erreur aux logs en mémoire pour diagnostic
        LoggerService.inMemoryLogs.push(`[${new Date().toISOString()}] ERROR: ${errorMessage}\n`);
      }
    }
  }

  async readLogs(): Promise<string> {
    try {
      const { data } = await Filesystem.readFile({
        path: this.logFileName,
        directory: this.logDirectory,
        encoding: Encoding.UTF8,
      });

      if (typeof data === 'string' && data.trim().length > 0) {
        return data;
      }
    } catch (error) {
      // AMÉLIORÉ ICI : Évite d'appeler this.log() pour ne pas causer d'erreur en cascade.
      const errorMessage = 'Impossible de lire le fichier de logs sur le téléphone.';
      console.error(errorMessage, error);
      LoggerService.inMemoryLogs.push(errorMessage);
    }

    if (LoggerService.inMemoryLogs.length > 0) {
      return LoggerService.inMemoryLogs.join('');
    }

    return '⚠️ Aucun log trouvé.';
  }

  getAllLogs(): string[] {
    return [...LoggerService.inMemoryLogs];
  }

  clearLogs(): void {
    LoggerService.inMemoryLogs = [];
  }

  async getLogFileInfo(): Promise<LogFileInfo> {
    try {
      const stat = await Filesystem.stat({
        path: this.logFileName,
        directory: this.logDirectory
      });

      return {
        exists: true,
        size: stat.size,
        lastModified: new Date(stat.mtime).toISOString(),
        path: this.logFileName,
        directory: this.logDirectory
      };
    } catch (error) {
      return {
        exists: false,
        error: (error as any)?.message || 'Unknown error',
        path: this.logFileName,
        directory: this.logDirectory
      };
    }
  }

  async getLogFileContent(): Promise<string> {
    try {
      const { data } = await Filesystem.readFile({
        path: this.logFileName,
        directory: this.logDirectory,
        encoding: Encoding.UTF8,
      });
      return data as string;
    } catch (error) {
      return `Erreur lecture fichier: ${(error as any)?.message || error}`;
    }
  }

  getInMemoryLogsCount(): number {
    return LoggerService.inMemoryLogs.length;
  }

  async clearLogFile(): Promise<boolean> {
    try {
      await Filesystem.deleteFile({
        path: this.logFileName,
        directory: this.logDirectory
      });

      // Recréer le fichier vide
      await this.initializeLogFile();
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier de logs:', error);
      return false;
    }
  }
}

export interface LogFileInfo {
  exists: boolean;
  size?: number;
  lastModified?: string;
  path: string;
  directory: any;
  error?: string;
}
