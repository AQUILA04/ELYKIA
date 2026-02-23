import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Storage } from '@ionic/storage-angular';
import { LoggerService } from './logger.service';
import { DatabaseService } from './database.service';
import { Client } from '../../models/client.model';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../store/auth/auth.selectors';

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
    private store: Store
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
              await this.updateClientProfilePhotoUrl(client.id, photoPath);
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
              await this.updateClientCardPhotoUrl(client.id, photoPath);
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

  private async updateClientProfilePhotoUrl(clientId: string, photoPath: string): Promise<void> {
    const sql = `UPDATE clients SET profilPhotoUrl = ? WHERE id = ?`;
    await this.dbService.execute(sql, [photoPath, clientId]);
  }

  private async updateClientCardPhotoUrl(clientId: string, photoPath: string): Promise<void> {
    const sql = `UPDATE clients SET cardPhotoUrl = ? WHERE id = ?`;
    await this.dbService.execute(sql, [photoPath, clientId]);
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
}
