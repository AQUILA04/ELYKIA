import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggerSimpleService {
  private static inMemoryLogs: string[] = [];
  private static readonly MAX_LOGS = 1000;

  constructor() {
    this.log('LoggerSimpleService initialized - using memory-only logging');
  }

  log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // Ajouter au début du tableau pour avoir les logs les plus récents en premier
    LoggerSimpleService.inMemoryLogs.unshift(logMessage);
    
    // Limiter le nombre de logs pour éviter les fuites mémoire
    if (LoggerSimpleService.inMemoryLogs.length > LoggerSimpleService.MAX_LOGS) {
      LoggerSimpleService.inMemoryLogs.splice(LoggerSimpleService.MAX_LOGS);
    }

    // Aussi logger dans la console
    console.log(logMessage);

    // Sauvegarder dans localStorage comme backup
    this.saveToLocalStorage();
  }

  error(message: string): void {
    this.log(`ERROR: ${message}`);
  }

  warn(message: string): void {
    this.log(`WARN: ${message}`);
  }

  info(message: string): void {
    this.log(`INFO: ${message}`);
  }

  private saveToLocalStorage(): void {
    try {
      // Sauvegarder seulement les 100 derniers logs dans localStorage
      const logsToSave = LoggerSimpleService.inMemoryLogs.slice(0, 100);
      localStorage.setItem('elykia_simple_logs', JSON.stringify(logsToSave));
    } catch (error) {
      // Si localStorage est plein ou indisponible, on ignore silencieusement
      console.warn('Cannot save logs to localStorage:', error);
    }
  }

  getAllLogs(): string[] {
    return [...LoggerSimpleService.inMemoryLogs];
  }

  getRecentLogs(count: number = 50): string[] {
    return LoggerSimpleService.inMemoryLogs.slice(0, count);
  }

  clearLogs(): void {
    LoggerSimpleService.inMemoryLogs = [];
    try {
      localStorage.removeItem('elykia_simple_logs');
    } catch (error) {
      console.warn('Cannot clear logs from localStorage:', error);
    }
    this.log('Logs cleared');
  }

  getLogsAsText(): string {
    return LoggerSimpleService.inMemoryLogs.join('\n');
  }

  exportLogs(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      logsCount: LoggerSimpleService.inMemoryLogs.length,
      logs: LoggerSimpleService.inMemoryLogs
    };

    return JSON.stringify(exportData, null, 2);
  }

  getLogStats(): LogStats {
    const logs = LoggerSimpleService.inMemoryLogs;
    const errorCount = logs.filter(log => log.includes('ERROR:')).length;
    const warnCount = logs.filter(log => log.includes('WARN:')).length;
    const infoCount = logs.filter(log => log.includes('INFO:')).length;
    const otherCount = logs.length - errorCount - warnCount - infoCount;

    return {
      total: logs.length,
      errors: errorCount,
      warnings: warnCount,
      info: infoCount,
      other: otherCount,
      oldestLog: logs.length > 0 ? logs[logs.length - 1] : null,
      newestLog: logs.length > 0 ? logs[0] : null
    };
  }

  // Restaurer les logs depuis localStorage au démarrage
  restoreFromLocalStorage(): void {
    try {
      const savedLogs = localStorage.getItem('elykia_simple_logs');
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        if (Array.isArray(parsedLogs)) {
          // Ajouter les logs sauvegardés (les plus anciens en dernier)
          LoggerSimpleService.inMemoryLogs.push(...parsedLogs.reverse());
          this.log(`Restored ${parsedLogs.length} logs from localStorage`);
        }
      }
    } catch (error) {
      console.warn('Cannot restore logs from localStorage:', error);
    }
  }

  // Méthode pour copier les logs dans le presse-papier
  async copyLogsToClipboard(): Promise<boolean> {
    try {
      const logsText = this.getLogsAsText();
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(logsText);
        this.log('Logs copied to clipboard successfully');
        return true;
      } else {
        // Fallback pour les navigateurs plus anciens
        const textarea = document.createElement('textarea');
        textarea.value = logsText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.log('Logs copied to clipboard (fallback method)');
        return true;
      }
    } catch (error) {
      this.error(`Failed to copy logs to clipboard: ${error}`);
      return false;
    }
  }
}

export interface LogStats {
  total: number;
  errors: number;
  warnings: number;
  info: number;
  other: number;
  oldestLog: string | null;
  newestLog: string | null;
}