import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ClientRepository } from '../../repositories/client.repository';
import { ClientRepositoryExtensions } from '../../repositories/client.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { Client } from '../../../models/client.model';
import { ClientSyncRequest } from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';
import { ClientSyncResponse } from 'src/app/models/api-sync-response.model';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Injectable({
    providedIn: 'root'
})
export class ClientSyncService extends BaseSyncService<Client, ClientRepository> {

    constructor(
        protected override http: HttpClient,
        protected override repository: ClientRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private clientRepositoryExtensions: ClientRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'client');
    }

    override async syncBatch(limit: number = 20): Promise<{ success: number; errors: number; failedIds?: string[] }> {
        // Base implementation calls fetchUnsynced and loops calling syncSingle
        return super.syncBatch(limit);
    }

    /**
     * Override to use Repository Extensions
     */
    protected override async fetchUnsynced(limit: number): Promise<Client[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        // Fetch unsynced items (isSync = false)
        const page = await this.clientRepositoryExtensions.findByCommercialPaginated(
            commercialUsername,
            0,
            limit,
            { isSync: false }
        );
        return page.content;
    }

    async syncSingle(item: Client): Promise<any> {
        const serverId = await this.repository.getServerId(item.id, 'client');
        if (serverId) {
            return this.updateSingleClient(item);
        } else {
            return this.syncSingleClient(item);
        }
    }

    private async syncSingleClient(client: Client): Promise<ClientSyncResponse> {
        const syncRequest = await this.prepareClientSyncRequest(client);
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.post<ApiResponse<ClientSyncResponse>>(`${this.baseUrl}/api/v1/clients`, syncRequest, { headers })
        );

        if (!response || !response.data) {
            throw new Error(response?.message || 'Invalid response from server');
        }

        const serverId = response.data.id.toString();

        await this.repository.saveIdMapping(client.id, serverId, 'client');
        await this.repository.updateSyncStatus(client.id, true);

        return response.data;
    }

    private async updateSingleClient(client: Client): Promise<ClientSyncResponse> {
        const syncRequest = await this.prepareClientSyncRequest(client);
        const headers = this.getAuthHeaders();

        const serverId = await this.repository.getServerId(client.id, 'client');
        if (!serverId) throw new Error(`Server ID not found for client ${client.id}`);

        const response = await firstValueFrom(
            this.http.put<ApiResponse<ClientSyncResponse>>(`${this.baseUrl}/api/v1/clients/${serverId}`, syncRequest, { headers })
        );

        if (!response || !response.data) {
            throw new Error(response?.message || 'Invalid response from server for client update');
        }

        await this.repository.updateSyncStatus(client.id, true);

        return response.data;
    }

    private async prepareClientSyncRequest(client: Client): Promise<ClientSyncRequest> {
        let iddocBase64: string | undefined;
        let profilPhotoBase64: string | undefined;

        try {
            if (client.cardPhoto) {
                const file = await Filesystem.readFile({ path: client.cardPhoto, directory: Directory.Data });
                iddocBase64 = file.data as string;
            }
            if (client.profilPhoto) {
                const file = await Filesystem.readFile({ path: client.profilPhoto, directory: Directory.Data });
                profilPhotoBase64 = file.data as string;
            }
        } catch (error) {
            console.error('Error reading image file for client sync', error);
            // Laisser les variables undefined, elles ne seront pas incluses dans le JSON
        }

        return {
            address: client.address || '',
            cardID: client.cardID || '',
            cardType: client.cardType || '',
            collector: client.commercial || '',
            tontineCollector: client.commercial || '',
            agencyCollector: 'COM001',
            dateOfBirth: client.dateOfBirth ? new Date(client.dateOfBirth).toISOString() : '',
            firstname: client.firstname || '',
            lastname: client.lastname || '',
            occupation: client.occupation || '',
            phone: client.phone || '',
            quarter: client.quarter || '',
            id: null,
            contactPersonName: client.contactPersonName || '',
            contactPersonPhone: client.contactPersonPhone || '',
            contactPersonAddress: client.contactPersonAddress || '',
            clientType: 'CLIENT',
            iddoc: iddocBase64,
            profilPhoto: profilPhotoBase64,
            longitude: client.longitude || 0,
            latitude: client.latitude || 0,
            mll: client.mll || '',
            code: client.code || '',
            profilPhotoUrl: client.profilPhotoUrl || '',
            cardPhotoUrl: client.cardPhotoUrl || ''
        };
    }
}
