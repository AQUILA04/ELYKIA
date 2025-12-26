import { Injectable } from '@angular/core';
import { ClientService } from './client.service';
import { PhotoSyncService } from './photo-sync.service';
import { SynchronizationService } from './synchronization.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class SyncManagerService {

  constructor(
    private clientService: ClientService,
    private photoSyncService: PhotoSyncService,
    private synchronizationService: SynchronizationService,
    private log: LoggerService
  ) {}

  /**
   * Synchronisation complète incluant les données et les photos
   * Utilise le service de synchronisation principal qui gère toutes les phases
   */
  async performFullSync(commercialUsername: string): Promise<void> {
    try {
      this.log.log('[SyncManagerService] Starting full synchronization');

      // 1. Initialiser les données des clients depuis l'API
      await this.clientService.initializeClients(commercialUsername, true).toPromise();

      // 2. Synchroniser toutes les données locales vers le serveur (incluant les URLs de photos)
      await this.synchronizationService.synchronizeAllData();

      this.log.log('[SyncManagerService] Full synchronization completed successfully');
    } catch (error) {
      this.log.log(`[SyncManagerService] Full synchronization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Synchronisation des photos uniquement (téléchargement depuis le serveur)
   */
  async syncPhotosOnly(): Promise<void> {
    try {
      this.log.log('[SyncManagerService] Starting photo synchronization');
      await this.photoSyncService.syncPhotosForClients();
      this.log.log('[SyncManagerService] Photo synchronization completed');
    } catch (error) {
      this.log.log(`[SyncManagerService] Photo synchronization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Synchronisation des URLs de photos uniquement (envoi vers le serveur)
   */
  async syncPhotoUrlsOnly(): Promise<void> {
    try {
      this.log.log('[SyncManagerService] Starting photo URL synchronization');
      
      const clientsWithUpdatedPhotoUrls = await this.photoSyncService.getClientsWithUpdatedPhotoUrls();
      
      if (clientsWithUpdatedPhotoUrls.length === 0) {
        this.log.log('[SyncManagerService] No clients with updated photo URLs to sync');
        return;
      }

      // Utiliser la synchronisation complète qui inclut la phase updated-photo-url-clients
      await this.synchronizationService.synchronizeAllData();
      
      this.log.log('[SyncManagerService] Photo URL synchronization completed');
    } catch (error) {
      this.log.log(`[SyncManagerService] Photo URL synchronization failed: ${error}`);
      throw error;
    }
  }
}