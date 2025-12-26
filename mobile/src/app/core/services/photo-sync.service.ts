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
  private readonly PROFILE_PHOTO_DIR = 'client_photos';
  private readonly CARD_PHOTO_DIR = 'card_photos';
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

  async syncPhotosForClients(): Promise<void> {
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
      const clients = await this.dbService.getClients(this.commercialUsername);
      const syncedClients = clients.filter(client => client.isSync && !client.isLocal);
      
      this.log.log(`[PhotoSyncService] Found ${syncedClients.length} synced clients to check for photos`);

      for (const client of syncedClients) {
        await this.syncClientPhotos(client, preferences);
      }
    } catch (error) {
      this.log.log(`[PhotoSyncService] Error syncing photos: ${error}`);
      console.error('Error syncing photos:', error);
    }
  }

  private async syncClientPhotos(client: Client, preferences: PhotoSyncPreferences): Promise<void> {
    let needsUpdate = false;

    // Synchroniser la photo de profil
    if (preferences.enableProfilePhotoSync) {
      const profilePhotoUpdated = await this.syncProfilePhoto(client);
      if (profilePhotoUpdated) {
        needsUpdate = true;
      }
    }

    // Synchroniser la photo de carte d'identité
    if (preferences.enableCardPhotoSync) {
      const cardPhotoUpdated = await this.syncCardPhoto(client);
      if (cardPhotoUpdated) {
        needsUpdate = true;
      }
    }

    // Marquer le client comme ayant des URLs de photos mises à jour
    if (needsUpdate) {
      await this.markClientPhotoUrlsUpdated(client.id);
    }
  }

  private async syncProfilePhoto(client: Client): Promise<boolean> {
    try {
      // Vérifier si la photo de profil doit être récupérée
      if (!(await this.shouldFetchProfilePhoto(client))) {
        return false;
      }

      this.log.log(`[PhotoSyncService] Fetching profile photo for client ${client.id}`);
      
      const photoData = await this.fetchProfilePhotoFromApi(client.id);
      if (!photoData || !photoData.data) {
        this.log.log(`[PhotoSyncService] No profile photo data for client ${client.id}`);
        return false;
      }

      // Sauvegarder la photo dans le système de fichiers
      const photoPath = await this.savePhotoToFileSystem(
        photoData.data, 
        this.PROFILE_PHOTO_DIR, 
        `profile_${client.id}_${Date.now()}.png`
      );

      // Mettre à jour l'URL de la photo de profil
      await this.updateClientProfilePhotoUrl(client.id, photoPath);
      
      this.log.log(`[PhotoSyncService] Profile photo saved for client ${client.id} at ${photoPath}`);
      return true;

    } catch (error) {
      this.log.log(`[PhotoSyncService] Error syncing profile photo for client ${client.id}: ${error}`);
      return false;
    }
  }

  private async syncCardPhoto(client: Client): Promise<boolean> {
    try {
      // Vérifier si la photo de carte doit être récupérée
      if (!(await this.shouldFetchCardPhoto(client))) {
        return false;
      }

      this.log.log(`[PhotoSyncService] Fetching card photo for client ${client.id}`);
      
      const photoData = await this.fetchCardPhotoFromApi(client.id);
      if (!photoData || !photoData.data) {
        this.log.log(`[PhotoSyncService] No card photo data for client ${client.id}`);
        return false;
      }

      // Sauvegarder la photo dans le système de fichiers
      const photoPath = await this.savePhotoToFileSystem(
        photoData.data, 
        this.CARD_PHOTO_DIR, 
        `card_${client.id}_${Date.now()}.png`
      );

      // Mettre à jour l'URL de la photo de carte
      await this.updateClientCardPhotoUrl(client.id, photoPath);
      
      this.log.log(`[PhotoSyncService] Card photo saved for client ${client.id} at ${photoPath}`);
      return true;

    } catch (error) {
      this.log.log(`[PhotoSyncService] Error syncing card photo for client ${client.id}: ${error}`);
      return false;
    }
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

  private async fetchProfilePhotoFromApi(clientId: string): Promise<any> {
    const url = `${environment.apiUrl}/api/v1/clients/profil-photo/${clientId}`;
    return this.http.get<any>(url).toPromise();
  }

  private async fetchCardPhotoFromApi(clientId: string): Promise<any> {
    const url = `${environment.apiUrl}/api/v1/clients/card-photo/${clientId}`;
    return this.http.get<any>(url).toPromise();
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