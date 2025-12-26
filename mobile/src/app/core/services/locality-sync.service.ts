import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';
import { SyncErrorService } from './sync-error.service';
import { Locality } from '../../models/locality.model';
import { ApiResponse } from '../../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class LocalitySyncService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private databaseService: DatabaseService,
    private authService: AuthService,
    private syncErrorService: SyncErrorService
  ) {}

  async syncLocalities(): Promise<{ success: number, errors: number }> {
    const unsyncedLocalities = await this.databaseService.getUnsyncedLocalities();
    if (unsyncedLocalities.length === 0) {
      return { success: 0, errors: 0 };
    }

    let success = 0;
    let errors = 0;

    for (const locality of unsyncedLocalities) {
      try {
        await this.syncSingleLocality(locality);
        success++;
      } catch (error) {
        errors++;
        await this.syncErrorService.logSyncError('locality', locality.id, 'CREATE', error, locality, `Localité ${locality.name}`, locality);
      }
    }

    return { success, errors };
  }

  private async syncSingleLocality(locality: Locality): Promise<void> {
    const headers = this.getAuthHeaders();
    const payload = { name: locality.name };

    const response = await firstValueFrom(
      this.http.post<ApiResponse<Locality>>(`${this.baseUrl}/api/v1/localities`, payload, { headers })
    );

    if (!response || !response.data || !response.data.id) {
      throw new Error('Invalid response from server during locality sync');
    }

    const serverLocality = response.data;
    await this.databaseService.markLocalityAsSynced(locality.id, parseInt(serverLocality.id, 10));
  }

  private getAuthHeaders(): HttpHeaders {
    const user = this.authService.currentUser;
    const token = user?.accessToken;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
}
