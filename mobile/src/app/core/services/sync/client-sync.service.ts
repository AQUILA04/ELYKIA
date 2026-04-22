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
import { ClientPhotoUrlUpdateDto } from '../../../models/client-photo-url-update.dto';
import { DateFilter } from '../../models/date-filter.model';

@Injectable({
    providedIn: 'root'
})
export class ClientSyncService extends BaseSyncService<Client, ClientRepository> {

    constructor(
        protected override http: HttpClient,
        protected override repository: ClientRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private readonly clientRepositoryExtensions: ClientRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'client');
    }

    /**
     * Orchestration complète de la synchronisation des clients.
     * Inclut :
     * 1. Création et mise à jour complète (via syncBatch)
     * 2. Mise à jour des photos
     * 3. Mise à jour des URLs de photos
     * 4. Mise à jour de la localisation
     */
    override async syncAll(batchSize: number = 20, dateFilter?: DateFilter): Promise<{ success: number; errors: number; failedIds: string[] }> {
        // 1. Synchronisation standard (Nouveaux clients et Mises à jour complètes)
        const baseResult = await super.syncAll(batchSize, dateFilter);

        // 2. Synchronisation des photos modifiées
        const photoResult = await this.syncUpdatedPhotos();

        // 3. Synchronisation des URLs de photos modifiées
        const photoUrlResult = await this.syncUpdatedPhotoUrls();

        // 4. Synchronisation de la localisation modifiée
        const locationResult = await this.syncUpdatedLocations();

        // Fusionner les résultats
        return {
            success: baseResult.success + photoResult.success + photoUrlResult.success + locationResult.success,
            errors: baseResult.errors + photoResult.errors + photoUrlResult.errors + locationResult.errors,
            failedIds: baseResult.failedIds || [] // On retourne principalement les IDs des clients dont la création/update a échoué
        };
    }

    override async syncBatch(limit: number = 20, dateFilter?: DateFilter): Promise<{ success: number; errors: number; failedIds: string[] }> {
        // Synchronisation standard (Nouveaux clients et Mises à jour complètes)
        return super.syncBatch(limit, dateFilter);
    }

    /**
     * Synchronise uniquement les photos des clients modifiés
     */
    async syncUpdatedPhotos(): Promise<{ success: number; errors: number }> {
        const result = { success: 0, errors: 0 };
        const updatedPhotoClients = await this.repository.getUpdatedPhotoClients();

        for (const client of updatedPhotoClients) {
            try {
                await this.syncUpdatedPhotoClient(client);
                result.success++;
            } catch (error) {
                result.errors++;
                await this.syncErrorService.logSyncError('client', client.id, 'UPDATE_PHOTO', error, client, `Client ${client.firstname} ${client.lastname}`, client);
            }
        }
        return result;
    }

    /**
     * Synchronise uniquement les URLs de photos des clients modifiés
     */
    async syncUpdatedPhotoUrls(): Promise<{ success: number; errors: number }> {
        const result = { success: 0, errors: 0 };
        // Cast nécessaire car la méthode a été ajoutée dynamiquement au repository ou via extension
        const updatedPhotoUrlClients = await (this.repository as any).getUpdatedPhotoUrlClients();

        for (const client of updatedPhotoUrlClients) {
            try {
                await this.syncUpdatedPhotoUrlClient(client);
                result.success++;
            } catch (error) {
                result.errors++;
                await this.syncErrorService.logSyncError('client', client.id, 'UPDATE_PHOTO_URL', error, client, `Client ${client.firstname} ${client.lastname}`, client);
            }
        }
        return result;
    }

    /**
     * Synchronise uniquement la localisation des clients modifiés
     */
    async syncUpdatedLocations(): Promise<{ success: number; errors: number }> {
        const result = { success: 0, errors: 0 };
        const updatedLocationClients = await (this.repository as any).getUpdatedLocationClients();

        for (const client of updatedLocationClients) {
            try {
                await this.syncUpdatedLocationClient(client);
                result.success++;
            } catch (error) {
                result.errors++;
                await this.syncErrorService.logSyncError('client', client.id, 'UPDATE_LOCATION', error, client, `Client ${client.firstname} ${client.lastname}`, client);
            }
        }
        return result;
    }

    /**
     * Override to use Repository Extensions
     */
    protected override async fetchUnsynced(limit: number, dateFilter?: DateFilter): Promise<Client[]> {
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

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server');
        }

        const serverId = response.data.id.toString();

        await this.repository.markAsSynced(client.id, serverId);
        await this.repository.saveIdMapping(client.id, serverId, 'client');

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

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server for client update');
        }

        await this.repository.updateSyncStatus(client.id, true);

        return response.data;
    }

    private async syncUpdatedPhotoClient(client: Client): Promise<void> {
        const requestBody = await this.prepareUpdatePhotoDto(client);
        const headers = this.getAuthHeaders();
        const response = await firstValueFrom(
            this.http.patch<ApiResponse<boolean>>(`${this.baseUrl}/api/v1/clients/photo-update`, requestBody, { headers })
        );

        if (response.statusCode === 200 && response.data === true) {
            await this.repository.markAsPhotoSynced(client.id);
        } else {
            throw new Error(response.message || 'Failed to sync updated client photo.');
        }
    }

    private async syncUpdatedPhotoUrlClient(client: Client): Promise<void> {
        const requestBody: ClientPhotoUrlUpdateDto = {
            id: client.id,
            profilPhotoUrl: client.profilPhotoUrl,
            cardPhotoUrl: client.cardPhotoUrl
        };

        const headers = this.getAuthHeaders();
        const response = await firstValueFrom(
            this.http.patch<ApiResponse<boolean>>(`${this.baseUrl}/api/v1/clients/update-photo-url`, requestBody, { headers })
        );

        if (response.statusCode === 200 && response.data === true) {
            await (this.repository as any).markAsPhotoUrlSynced(client.id);
        } else {
            throw new Error(response.message || 'Failed to sync updated client photo URLs.');
        }
    }

    private async syncUpdatedLocationClient(client: Client): Promise<void> {
        const requestBody = {
            id: client.id,
            latitude: client.latitude,
            longitude: client.longitude
        };
        const headers = this.getAuthHeaders();
        const response = await firstValueFrom(
            this.http.patch<ApiResponse<boolean>>(`${this.baseUrl}/api/v1/clients/location-update`, requestBody, { headers })
        );

        if (response.statusCode === 200 && response.data === true) {
            await this.repository.markAsLocationSynced(client.id);
        } else {
            throw new Error(response.message || 'Failed to sync updated client location.');
        }
    }

    private async prepareClientSyncRequest(client: Client): Promise<ClientSyncRequest> {
        let iddocBase64: string | undefined;
        let profilPhotoBase64: string | undefined;

        try {
            if (client.cardPhoto) {
                const file = await Filesystem.readFile({ path: client.cardPhoto, directory: Directory.ExternalStorage });
                iddocBase64 = file.data as string;
            }
            if (client.profilPhoto) {
                const file = await Filesystem.readFile({ path: client.profilPhoto, directory: Directory.ExternalStorage });
                profilPhotoBase64 = file.data as string;
            }
        } catch (error) {
            console.error('Error reading image file for client sync', error);
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
            cardPhotoUrl: client.cardPhotoUrl || '',
            profilPhotoThumbUrl: client.profilPhotoThumbUrl || '', // Use specific thumb path if available
            cardPhotoThumbUrl: client.cardPhotoThumbUrl || ''      // Use specific thumb path if available
        };
    }

    private async prepareUpdatePhotoDto(client: Client): Promise<any> {
        let profilPhotoBase64: string | undefined;
        let cardPhotoBase64: string | undefined;

        try {
            if (client.profilPhoto) {
                const file = await Filesystem.readFile({ path: client.profilPhoto, directory: Directory.ExternalStorage });
                profilPhotoBase64 = file.data as string;
            }
            if (client.cardPhoto) {
                const file = await Filesystem.readFile({ path: client.cardPhoto, directory: Directory.ExternalStorage });
                cardPhotoBase64 = file.data as string;
            }
        } catch (error) {
            console.error('Error reading image file for photo update sync', error);
        }

        return {
            clientId: client.id,
            profilPhoto: profilPhotoBase64,
            cardPhoto: cardPhotoBase64,
            cardType: client.cardType,
            cardNumber: client.cardID
        };
    }
}
