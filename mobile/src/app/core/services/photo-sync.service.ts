import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Storage } from '@ionic/storage-angular';
import { LoggerService } from './logger.service';
import { DatabaseService } from './database.service';
import { Client } from '../../models/client.model';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { ThumbnailService } from './thumbnail.service';

export interface PhotoSyncPreferences {
  enableProfilePhotoSync: boolean;
  enableCardPhotoSync: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoSyncService {
  private readonly PROFILE_PHOTO_DIR = 'Pictures/Elykia/client_photos';
  private readonly CARD_PHOTO_DIR = 'Pictures/Elykia/card_photos';
  private commercialUsername: string | undefined;

  constructor(
    private http: HttpClient,
    private storage: Storage,
    private log: LoggerService,
    private dbService: DatabaseService,
    private store: Store,
    private thumbnailService: ThumbnailService
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }

  async getPhotoSyncPreferences(): Promise<PhotoSyncPreferences> {
    const enableProfilePhotoSync = await this.storage.get('enableProfilePhotoSync') || true;
    const enableCardPhotoSync = await this.storage.get('enableCardPhotoSync') || true;

    return {
      enableProfilePhotoSync,
      enableCardPhotoSync
    };
  }

  async setPhotoSyncPreferences(preferences: PhotoSyncPreferences): Promise<void> {
    await this.storage.set('enableProfilePhotoSync', preferences.enableProfilePhotoSync);
    await this.storage.set('enableCardPhotoSync', preferences.enableCardPhotoSync);
  }

  async syncPhotosForClients(clients?: Client[]): Promise<void> {
    const preferences = await this.getPhotoSyncPreferences();

    if (!preferences.enableProfilePhotoSync && !preferences.enableCardPhotoSync) {
      this.log.log('[PhotoSyncService] Photo sync disabled in preferences');
      return;
    }

    if (!this.commercialUsername) {
      this.log.log('[PhotoSyncService] Commercial user not identified. Cannot sync photos.');
      return;
    }

    try {
      let syncedClients: Client[];
      if (clients) {
        syncedClients = clients.filter(client => client.isSync && !client.isLocal);
      } else {
        const allClients = await this.dbService.getClients(this.commercialUsername);
        syncedClients = allClients.filter(client => client.isSync && !client.isLocal);
      }

      this.log.log(`[PhotoSyncService] Found ${syncedClients.length} synced clients to check for photos`);

      // Batch processing for profile photos
      if (preferences.enableProfilePhotoSync) {
        const clientsNeedingProfilePhoto = await this.filterClientsNeedingProfilePhoto(syncedClients);
        if (clientsNeedingProfilePhoto.length > 0) {
          await this.syncProfilePhotosBatch(clientsNeedingProfilePhoto);
        }
      }

      // Batch processing for card photos
      if (preferences.enableCardPhotoSync) {
        const clientsNeedingCardPhoto = await this.filterClientsNeedingCardPhoto(syncedClients);
        if (clientsNeedingCardPhoto.length > 0) {
          await this.syncCardPhotosBatch(clientsNeedingCardPhoto);
        }
      }

    } catch (error) {
      this.log.log(`[PhotoSyncService] Error syncing photos: ${error}`);
      console.error('Error syncing photos:', error);
    }
  }

  private async filterClientsNeedingProfilePhoto(clients: Client[]): Promise<Client[]> {
    const needingPhoto: Client[] = [];
    for (const client of clients) {
      if (await this.shouldFetchProfilePhoto(client)) {
        needingPhoto.push(client);
      }
    }
    return needingPhoto;
  }

  private async filterClientsNeedingCardPhoto(clients: Client[]): Promise<Client[]> {
    const needingPhoto: Client[] = [];
    for (const client of clients) {
      if (await this.shouldFetchCardPhoto(client)) {
        needingPhoto.push(client);
      }
    }
    return needingPhoto;
  }

  private async syncProfilePhotosBatch(clients: Client[]): Promise<void> {
    const clientIds = clients.map(c => parseInt(c.id, 10)); // Assuming IDs are numeric for backend
    this.log.log(`[PhotoSyncService] Fetching profile photos for ${clientIds.length} clients`);

    try {
      const response = await this.fetchProfilePhotosBatchFromApi(clientIds);
      if (response && response.data) {
        const photos: { clientId: number, photo: string }[] = response.data;
        for (const item of photos) {
          if (item.photo) {
            const client = clients.find(c => parseInt(c.id, 10) === item.clientId);
            if (client) {
              const photoPath = await this.savePhotoToFileSystem(
                item.photo,
                this.PROFILE_PHOTO_DIR,
                `profile_${client.id}_${Date.now()}.png`
              );

              // Generate thumbnail
              const thumbPath = await this.thumbnailService.generateThumbnail(photoPath, 200, 200);

              // Update client with both paths
              await this.updateClientProfilePhotoUrl(client.id, photoPath, thumbPath);
              await this.markClientPhotoUrlsUpdated(client.id);
            }
          }
        }
        this.log.log(`[PhotoSyncService] Batch profile photos synced for ${photos.length} clients`);
      }
    } catch (error) {
      this.log.log(`[PhotoSyncService] Error syncing batch profile photos: ${error}`);
    }
  }

  private async syncCardPhotosBatch(clients: Client[]): Promise<void> {
    const clientIds = clients.map(c => parseInt(c.id, 10));
    this.log.log(`[PhotoSyncService] Fetching card photos for ${clientIds.length} clients`);

    try {
      const response = await this.fetchCardPhotosBatchFromApi(clientIds);
      if (response && response.data) {
        const photos: { clientId: number, photo: string }[] = response.data;
        for (const item of photos) {
          if (item.photo) {
            const client = clients.find(c => parseInt(c.id, 10) === item.clientId);
            if (client) {
              const photoPath = await this.savePhotoToFileSystem(
                item.photo,
                this.CARD_PHOTO_DIR,
                `card_${client.id}_${Date.now()}.png`
              );

              // Generate thumbnail
              const thumbPath = await this.thumbnailService.generateThumbnail(photoPath, 200, 200);

              await this.updateClientCardPhotoUrl(client.id, photoPath, thumbPath);
              await this.markClientPhotoUrlsUpdated(client.id);
            }
          }
        }
        this.log.log(`[PhotoSyncService] Batch card photos synced for ${photos.length} clients`);
      }
    } catch (error) {
      this.log.log(`[PhotoSyncService] Error syncing batch card photos: ${error}`);
    }
  }

  private async fetchProfilePhotosBatchFromApi(clientIds: number[]): Promise<any> {
    const url = `${environment.apiUrl}/api/v1/clients/profil-photos`;
    return this.http.post<any>(url, clientIds).toPromise();
  }

  private async fetchCardPhotosBatchFromApi(clientIds: number[]): Promise<any> {
    const url = `${environment.apiUrl}/api/v1/clients/card-photos`;
    return this.http.post<any>(url, clientIds).toPromise();
  }

  private async shouldFetchProfilePhoto(client: Client): Promise<boolean> {
    // Récupérer si pas d'URL ou si le fichier n'existe pas
    if (!client.profilPhotoUrl) {
      return true;
    }

    // Vérifier si le fichier existe dans le système de fichiers
    try {
      const exists = await this.checkIfFileExists(client.profilPhotoUrl);
      return !exists;
    } catch {
      return true;
    }
  }

  private async shouldFetchCardPhoto(client: Client): Promise<boolean> {
    // Récupérer si pas d'URL ou si le fichier n'existe pas
    if (!client.cardPhotoUrl) {
      return true;
    }

    // Vérifier si le fichier existe dans le système de fichiers
    try {
      const exists = await this.checkIfFileExists(client.cardPhotoUrl);
      return !exists;
    } catch {
      return true;
    }
  }

  private async checkIfFileExists(filePath: string): Promise<boolean> {
    try {
      await Filesystem.stat({
        path: filePath,
        directory: Directory.Data
      });
      return true;
    } catch {
      return false;
    }
  }

  private async savePhotoToFileSystem(base64Data: string, directory: string, fileName: string): Promise<string> {
    try {
      // Créer le répertoire s'il n'existe pas.
      // Enveloppé dans un try/catch pour ignorer l'erreur "directory already exists" sur Android.
      try {
        await Filesystem.mkdir({
          path: directory,
          directory: Directory.Data,
          recursive: true
        });
      } catch (e: any) {
        // Ignorer l'erreur si le dossier existe déjà, sinon la relancer
        if (e.message && !e.message.includes('already exists')) {
          this.log.log(`[PhotoSyncService] Error creating directory, but it was not an 'already exists' error: ${e.message}`);
          throw e;
        }
      }

      const filePath = `${directory}/${fileName}`;

      // Sauvegarder le fichier
      await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Data
      });

      return filePath;
    } catch (error) {
      this.log.log(`[PhotoSyncService] Error saving photo to filesystem: ${error}`);
      throw error;
    }
  }

  private async updateClientProfilePhotoUrl(clientId: string, photoPath: string, thumbPath?: string): Promise<void> {
    // We store the thumbnail path in profilPhotoUrl for list display performance
    // The original full-res path is stored in profilPhoto
    const sql = `UPDATE clients SET profilPhotoUrl = ?, profilPhoto = ? WHERE id = ?`;
    await this.dbService.execute(sql, [thumbPath || photoPath, photoPath, clientId]);
  }

  private async updateClientCardPhotoUrl(clientId: string, photoPath: string, thumbPath?: string): Promise<void> {
    // Similar logic for card photos
    const sql = `UPDATE clients SET cardPhotoUrl = ?, cardPhoto = ? WHERE id = ?`;
    await this.dbService.execute(sql, [thumbPath || photoPath, photoPath, clientId]);
  }

  private async markClientPhotoUrlsUpdated(clientId: string): Promise<void> {
    const sql = `UPDATE clients SET updatedPhotoUrl = 1 WHERE id = ?`;
    await this.dbService.execute(sql, [clientId]);
  }

  async getClientsWithUpdatedPhotoUrls(): Promise<Client[]> {
    const sql = `SELECT * FROM clients WHERE updatedPhotoUrl = 1`;
    const result = await this.dbService.query(sql);
    return result.values || [];
  }

  async markClientPhotoUrlsSynced(clientId: string): Promise<void> {
    const sql = `UPDATE clients SET updatedPhotoUrl = 0 WHERE id = ?`;
    await this.dbService.execute(sql, [clientId]);
  }

  // =================================================================================================
  // REPAIR MISSING SERVER PHOTOS
  // =================================================================================================

  async repairServerPhotos(progressCallback?: (message: string) => void): Promise<void> {
    if (!this.commercialUsername) {
      this.log.log('[PhotoSyncService] Commercial user not identified. Cannot repair photos.');
      return;
    }

    try {
      if (progressCallback) progressCallback('Analyse des clients locaux...');

      // 1. Récupérer les clients locaux synchronisés avec des URLs de photos
      const allClients = await this.dbService.getClients(this.commercialUsername);
      const candidates = allClients.filter(c =>
        c.isSync &&
        !c.isLocal &&
        (c.profilPhotoUrl || c.cardPhotoUrl)
      );

      this.log.log(`[PhotoSyncService] Found ${candidates.length} candidates for repair`);
      if (progressCallback) progressCallback(`${candidates.length} clients candidats trouvés.`);

      // 2. Vérifier l'existence physique des fichiers
      const validClients: Client[] = [];
      for (const client of candidates) {
        let hasValidFile = false;
        if (client.profilPhotoUrl && await this.checkIfFileExists(client.profilPhotoUrl)) {
          hasValidFile = true;
        }
        if (client.cardPhotoUrl && await this.checkIfFileExists(client.cardPhotoUrl)) {
          hasValidFile = true;
        }

        if (hasValidFile) {
          validClients.push(client);
        }
      }

      this.log.log(`[PhotoSyncService] ${validClients.length} clients have valid local files`);
      if (progressCallback) progressCallback(`${validClients.length} clients avec fichiers valides.`);

      // 3. Batch Check avec le backend (par lots de 20)
      const BATCH_SIZE = 20;
      for (let i = 0; i < validClients.length; i += BATCH_SIZE) {
        const batch = validClients.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(c => parseInt(c.id, 10));

        if (progressCallback) progressCallback(`Vérification lot ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(validClients.length/BATCH_SIZE)}...`);

        const checkResponse = await this.http.post<any>(`${environment.apiUrl}/api/v1/clients/check-missing-photos`, batchIds).toPromise();

        if (checkResponse && checkResponse.data) {
          const missingList: { clientId: number, missingProfil: boolean, missingCard: boolean }[] = checkResponse.data;

          // Filtrer ceux qui ont vraiment besoin d'une mise à jour
          const toUpdate = missingList.filter(item => item.missingProfil || item.missingCard);

          if (toUpdate.length > 0) {
            await this.processRepairBatch(toUpdate, validClients, progressCallback);
          }
        }
      }

      if (progressCallback) progressCallback('Réparation terminée avec succès.');

    } catch (error) {
      this.log.log(`[PhotoSyncService] Error repairing photos: ${error}`);
      if (progressCallback) progressCallback('Erreur lors de la réparation.');
      console.error('Error repairing photos:', error);
    }
  }

  private async processRepairBatch(
    missingList: { clientId: number, missingProfil: boolean, missingCard: boolean }[],
    clients: Client[],
    progressCallback?: (message: string) => void
  ): Promise<void> {

    // Traiter par petits lots de 5 pour éviter OOM avec les Base64
    const UPLOAD_BATCH_SIZE = 5;

    for (let i = 0; i < missingList.length; i += UPLOAD_BATCH_SIZE) {
      const batchItems = missingList.slice(i, i + UPLOAD_BATCH_SIZE);
      const updateDtos: any[] = [];

      for (const item of batchItems) {
        const client = clients.find(c => parseInt(c.id, 10) === item.clientId);
        if (!client) continue;

        let profilPhotoBase64 = null;
        let cardPhotoBase64 = null;

        if (item.missingProfil && client.profilPhotoUrl) {
          try {
            const file = await Filesystem.readFile({
              path: client.profilPhotoUrl,
              directory: Directory.Data,
              encoding: Encoding.UTF8 // Assuming base64 string is stored directly or read as string
            });
            // Si le fichier contient déjà le préfixe data:image..., on peut l'utiliser tel quel ou le nettoyer
            // Ici on suppose que readFile retourne le contenu. Si c'est binaire, il faut ajuster.
            // Généralement Filesystem.readFile retourne { data: string }
            profilPhotoBase64 = file.data;
          } catch (e) {
            this.log.log(`[PhotoSyncService] Failed to read profile photo for ${client.id}: ${e}`);
          }
        }

        if (item.missingCard && client.cardPhotoUrl) {
          try {
            const file = await Filesystem.readFile({
              path: client.cardPhotoUrl,
              directory: Directory.Data,
              encoding: Encoding.UTF8
            });
            cardPhotoBase64 = file.data;
          } catch (e) {
            this.log.log(`[PhotoSyncService] Failed to read card photo for ${client.id}: ${e}`);
          }
        }

        if (profilPhotoBase64 || cardPhotoBase64) {
          updateDtos.push({
            clientId: item.clientId,
            profilPhoto: profilPhotoBase64,
            cardPhoto: cardPhotoBase64
          });
        }
      }

      if (updateDtos.length > 0) {
        if (progressCallback) progressCallback(`Envoi correctif pour ${updateDtos.length} clients...`);
        try {
          await this.http.post(`${environment.apiUrl}/api/v1/clients/photos-batch-update`, updateDtos).toPromise();
          this.log.log(`[PhotoSyncService] Successfully repaired photos for ${updateDtos.length} clients`);
        } catch (e) {
          this.log.log(`[PhotoSyncService] Failed to upload repair batch: ${e}`);
        }
      }
    }
  }
}
