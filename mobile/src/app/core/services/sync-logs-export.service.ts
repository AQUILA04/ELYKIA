import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { SyncErrorService } from './sync-error.service';
import { SyncError } from '../../models/sync.model';

@Injectable({
  providedIn: 'root'
})
export class SyncLogsExportService {

  constructor(
    private syncErrorService: SyncErrorService
  ) {}

  /**
   * Exporter automatiquement les logs de synchronisation après une sync
   * @param syncResult Résultat de la synchronisation (optionnel)
   */
  async exportSyncLogsAfterSync(syncResult?: any): Promise<string | null> {
    try {
      // Récupérer toutes les erreurs de synchronisation
      const errors = await this.syncErrorService.getSyncErrors();

      // Si aucune erreur, ne pas créer de fichier
      if (errors.length === 0) {
        console.log('Aucune erreur de synchronisation à exporter');
        return null;
      }

      // Générer le contenu JSON
      const jsonContent = this.generateSyncLogsJSON(errors, syncResult);

      // Générer le nom de fichier avec date et heure
      const filename = this.generateFilename();

      // Sauvegarder dans External Storage
      const filePath = await this.saveToExternalStorage(jsonContent, filename);

      console.log('Logs de synchronisation exportés:', filePath);
      return filePath;
    } catch (error) {
      console.error('Erreur lors de l\'export des logs de synchronisation:', error);
      return null;
    }
  }

  /**
   * Générer le contenu JSON des logs de synchronisation
   */
  private generateSyncLogsJSON(errors: SyncError[], syncResult?: any): string {
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      summary: {
        totalErrors: errors.length,
        errorsByType: this.groupErrorsByType(errors),
        errorsByOperation: this.groupErrorsByOperation(errors)
      },
      syncResult: syncResult || null,
      errors: errors.map(error => ({
        id: error.id,
        entityType: error.entityType,
        entityId: error.entityId,
        entityDisplayName: error.entityDisplayName,
        operation: error.operation,
        errorMessage: error.errorMessage,
        errorCode: error.errorCode || 'N/A',
        syncDate: error.syncDate,
        retryCount: error.retryCount,
        canRetry: error.canRetry,
        entityDetails: error.entityDetails,
        requestData: error.requestData,
        responseData: error.responseData
      }))
    };

    // Convertir en JSON avec indentation pour la lisibilité
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Grouper les erreurs par type d'entité
   */
  private groupErrorsByType(errors: SyncError[]): { [key: string]: number } {
    const grouped: { [key: string]: number } = {};
    errors.forEach(error => {
      grouped[error.entityType] = (grouped[error.entityType] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Grouper les erreurs par opération
   */
  private groupErrorsByOperation(errors: SyncError[]): { [key: string]: number } {
    const grouped: { [key: string]: number } = {};
    errors.forEach(error => {
      grouped[error.operation] = (grouped[error.operation] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Générer le nom de fichier avec date et heure
   * Format: logs_YYYYMMDD_HHmmss.json
   */
  private generateFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `logs_${year}${month}${day}_${hours}${minutes}${seconds}.json`;
  }

  /**
   * Sauvegarder le fichier dans External Storage
   * Chemin: External Storage/Documents/elykia/sync-logs/
   */
  private async saveToExternalStorage(content: string, filename: string): Promise<string> {
    try {
      // Créer le dossier elykia/sync-logs s'il n'existe pas
      await this.ensureDirectoryExists();

      // Sauvegarder le fichier
      const result = await Filesystem.writeFile({
        path: `elykia/sync-logs/${filename}`,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      return result.uri;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du fichier:', error);
      throw error;
    }
  }

  /**
   * S'assurer que le dossier elykia/sync-logs existe
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      // Créer le dossier elykia
      try {
        await Filesystem.mkdir({
          path: 'elykia',
          directory: Directory.Documents,
          recursive: false
        });
      } catch (error: any) {
        // Ignorer si le dossier existe déjà
        if (error.message && !error.message.includes('exists')) {
          throw error;
        }
      }

      // Créer le dossier sync-logs
      try {
        await Filesystem.mkdir({
          path: 'elykia/sync-logs',
          directory: Directory.Documents,
          recursive: false
        });
      } catch (error: any) {
        // Ignorer si le dossier existe déjà
        if (error.message && !error.message.includes('exists')) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la création des dossiers:', error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des fichiers de logs exportés
   */
  async getExportedLogFiles(): Promise<string[]> {
    try {
      const result = await Filesystem.readdir({
        path: 'elykia/sync-logs',
        directory: Directory.Documents
      });

      return result.files
        .filter(file => file.name.endsWith('.json'))
        .map(file => file.name)
        .sort()
        .reverse(); // Plus récents en premier
    } catch (error) {
      console.error('Erreur lors de la lecture des fichiers de logs:', error);
      return [];
    }
  }

  /**
   * Supprimer les anciens fichiers de logs (garder les 30 derniers)
   */
  async cleanOldLogFiles(): Promise<void> {
    try {
      const files = await this.getExportedLogFiles();

      // Garder les 30 derniers fichiers
      const filesToDelete = files.slice(30);

      for (const filename of filesToDelete) {
        try {
          await Filesystem.deleteFile({
            path: `elykia/sync-logs/${filename}`,
            directory: Directory.Documents
          });
          console.log('Ancien fichier de logs supprimé:', filename);
        } catch (error) {
          console.error('Erreur lors de la suppression du fichier:', filename, error);
        }
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des anciens logs:', error);
    }
  }
}
