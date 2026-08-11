import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseSyncService } from './base-sync.service';
import { Locality } from '../../../models/locality.model';
import { LocalityRepository } from '../../repositories/locality.repository';
import { LocalityRepositoryExtensions } from '../../repositories/locality.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { ApiResponse } from '../../../models/api-response.model';
import { DateFilter } from '../../models/date-filter.model';

@Injectable({
    providedIn: 'root'
})
export class LocalitySyncService extends BaseSyncService<Locality, LocalityRepository> {

    constructor(
        protected override http: HttpClient,
        protected override repository: LocalityRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private readonly localityRepositoryExtensions: LocalityRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'locality');
    }

    async syncSingle(item: Locality): Promise<any> {
        if (item.isLocal) {
            return this.createLocality(item);
        } else {
            return this.updateLocality(item);
        }
    }

    /**
     * Crée une localité sur le serveur sans modifier SQLite (online-first).
     */
    async postCreateLocality(locality: Pick<Locality, 'name'>): Promise<Locality> {
        const syncRequest = { name: locality.name };
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.post<ApiResponse<Locality>>(`${this.baseUrl}/api/v1/localities`, syncRequest, { headers })
        );

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server for locality sync');
        }

        return {
            ...response.data,
            id: String(response.data.id)
        };
    }

    protected override async fetchUnsynced(limit: number, dateFilter?: DateFilter): Promise<Locality[]> {
        // LocalityRepositoryExtensions.findAllPaginated supports isSync filter now.
        // It does NOT filter by commercial because localities are global/tenant based.
        const page = await this.localityRepositoryExtensions.findAllPaginated(0, limit, { isSync: false, isActive: undefined });
        return page.content;
    }

    private async createLocality(locality: Locality): Promise<Locality> {
        const syncedLocality = await this.postCreateLocality(locality);
        await this.repository.saveIdMapping(locality.id, syncedLocality.id, 'locality');
        await this.repository.markAsSynced(locality.id, syncedLocality.id);
        return syncedLocality;
    }

    private async updateLocality(locality: Locality): Promise<Locality> {
        const syncRequest = {
            name: locality.name
        };
        const headers = this.getAuthHeaders();

        // Use ID from mapping or locality.id if it is server ID
        // If isLocal=false, locality.id IS server ID (or should be).
        const serverId = locality.id;

        const response = await firstValueFrom(
            this.http.put<ApiResponse<Locality>>(`${this.baseUrl}/api/v1/localities/${serverId}`, syncRequest, { headers })
        );

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server for locality update');
        }

        await this.repository.markAsSynced(locality.id, locality.id);
        return response.data;
    }
}
