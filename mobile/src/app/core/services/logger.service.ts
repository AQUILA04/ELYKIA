import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import {FirebaseCrashlytics} from "@capacitor-firebase/crashlytics";
import {Capacitor} from "@capacitor/core";

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private static inMemoryLogs: string[] = [];
  /** Taille maximale d'un fichier de journal avant rotation. */
  static readonly MAX_LOG_BYTES = 1_000_000;
  /** Nombre de fichiers conservés : app_logs.txt, app_logs.1.txt, app_logs.2.txt. */
  static readonly LOG_FILES_KEPT = 3;
  private static currentUsername: string | null = null;
  /** Remplaçable en test : les spies sur le proxy Capacitor web ne prennent pas. */
  private fs: Pick<typeof Filesystem, 'stat' | 'writeFile' | 'appendFile' | 'readFile' | 'deleteFile' | 'rename'> = Filesystem;
  private approxLogBytes = 0;
  private rotating = false;

  /** Renseigné par AuthService (le logger ne peut pas l'injecter : dépendance circulaire). */
  static setCurrentUsername(username: string | null): void {
    LoggerService.currentUsername = username;
  }
  /** Une seule écriture disque à la fois : les append parallèles bloquent le pont Android. */
  private fileQueue: Promise<void> = Promise.resolve();
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
      if (fileExists) {
        const stat = await this.fs.stat({ path: this.logFileName, directory: this.logDirectory })
          .catch(() => null);
        this.approxLogBytes = stat?.size ?? 0;
        await this.rotateIfNeeded();
      }

      if (!fileExists) {
        // Créer le fichier s'il n'existe pas
        await this.fs.writeFile({
          path: this.logFileName,
          data: `--- Log Initialized at ${new Date().toISOString()} ---\n`,
          directory: this.logDirectory,
          encoding: Encoding.UTF8,
        });
        console.log('✅ Fichier de logs créé avec succès');
      } else {
        // Ajouter une ligne de séparation si le fichier existe déjà
        await this.fs.appendFile({
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
      await this.fs.stat({
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
    const logMessage = this.remember(message);
    this.enqueueFileWrite(logMessage);
    if (Capacitor.getPlatform() !== 'web') {
      void FirebaseCrashlytics.log({ message: logMessage }).catch(() => undefined);
    }
  }

  /**
   * Trace de diagnostic : mémoire + fichier, sans Crashlytics.
   * Les rafales (battement, taps) ne doivent pas bloquer le thread WebView.
   */
  trace(message: string): void {
    const logMessage = this.remember(message);
    this.enqueueFileWrite(logMessage);
  }

  private remember(message: string): string {
    const user = LoggerService.currentUsername ? ` [${LoggerService.currentUsername}]` : '';
    const logMessage = `[${new Date().toISOString()}]${user} ${message}\n`;
    LoggerService.inMemoryLogs.push(logMessage);
    if (LoggerService.inMemoryLogs.length > 500) {
      LoggerService.inMemoryLogs.splice(0, LoggerService.inMemoryLogs.length - 500);
    }
    return logMessage;
  }

  private enqueueFileWrite(logMessage: string): void {
    this.fileQueue = this.fileQueue
      .then(() => this.saveToFileAsync(logMessage))
      .catch(() => undefined);
  }

  /**
   * Sérialise une erreur pour les logs (Error natif, erreurs SQLite Capacitor, objets quelconques).
   * JSON.stringify(Error) produit "{}" — cette méthode évite ce piège.
   */
  formatError(error: unknown): string {
    if (error == null) {
      return 'unknown error (null/undefined)';
    }

    if (error instanceof Error) {
      const extra: Record<string, unknown> = {};
      const errObj = error as Error & Record<string, unknown>;
      for (const key of ['code', 'result', 'changes', 'lastId', 'status', 'statusText']) {
        if (errObj[key] !== undefined) {
          extra[key] = errObj[key];
        }
      }
      return JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...extra
      });
    }

    if (typeof error === 'object') {
      try {
        const obj = error as Record<string, unknown>;
        if ('message' in obj || 'code' in obj || 'result' in obj) {
          return JSON.stringify(obj);
        }
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    }

    return String(error);
  }

  async error(message: string, error?: unknown) {
      const errorMessage = error !== undefined ? `${message}: ${this.formatError(error)}` : message;
      console.error(errorMessage);
      const logMessage = this.remember(`ERROR: ${errorMessage}`);
      this.enqueueFileWrite(logMessage);
  }

  /** Nom du fichier de rang `index` (0 = courant). */
  logFileNameAt(index: number): string {
    return index === 0 ? this.logFileName : this.logFileName.replace(/\.txt$/, `.${index}.txt`);
  }

  /** Le plus ancien est supprimé, puis chaque fichier passe au rang suivant. Un échec n'empêche jamais l'écriture. */
  private async rotateIfNeeded(): Promise<void> {
    if (this.rotating || this.approxLogBytes < LoggerService.MAX_LOG_BYTES) {
      return;
    }
    this.rotating = true;
    try {
      const last = LoggerService.LOG_FILES_KEPT - 1;
      await this.fs.deleteFile({ path: this.logFileNameAt(last), directory: this.logDirectory })
        .catch(() => undefined);
      for (let index = last - 1; index >= 0; index--) {
        await this.fs.rename({
          from: this.logFileNameAt(index),
          to: this.logFileNameAt(index + 1),
          directory: this.logDirectory,
          toDirectory: this.logDirectory,
        }).catch(() => undefined);
      }
      this.approxLogBytes = 0;
    } finally {
      this.rotating = false;
    }
  }

  /** Concatène les fichiers conservés (du plus ancien au plus récent) dans un seul export. */
  async exportLogs(username: string | null): Promise<string | null> {
    try {
      let content = '';
      for (let index = LoggerService.LOG_FILES_KEPT - 1; index >= 0; index--) {
        try {
          const { data } = await this.fs.readFile({
            path: this.logFileNameAt(index),
            directory: this.logDirectory,
            encoding: Encoding.UTF8,
          });
          if (typeof data === 'string') {
            content += data;
          }
        } catch {
          // Fichier absent : rang non utilisé.
        }
      }
      if (!content) {
        return null;
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = `elykia/journal-${username || 'rm'}-${stamp}.txt`;
      await this.fs.writeFile({
        path,
        data: content,
        directory: this.logDirectory,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return path;
    } catch (error) {
      console.warn('Export du journal impossible', error);
      return null;
    }
  }

  private async saveToFileAsync(logMessage: string) {
    try {
      this.approxLogBytes += logMessage.length;
      await this.rotateIfNeeded();
      await this.fs.appendFile({
        path: this.logFileName,
        data: logMessage,
        directory: this.logDirectory,
        encoding: Encoding.UTF8,
      });
    } catch (error: any) {
      // Si l'écriture échoue, essayer de recréer le fichier
      try {
        await this.fs.writeFile({
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
      const { data } = await this.fs.readFile({
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
      const stat = await this.fs.stat({
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
      const { data } = await this.fs.readFile({
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
      await this.fs.deleteFile({
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

  async recordException(message: string): Promise<void> {
    try {
      if (Capacitor.getPlatform() !== 'web') {
        await FirebaseCrashlytics.recordException({ message });
      }

    } catch (error) {
      console.error('Failed to record exception to Crashlytics:', error);
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
