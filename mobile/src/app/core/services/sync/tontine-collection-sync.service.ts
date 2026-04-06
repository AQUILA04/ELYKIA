import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TontineCollectionRepository } from '../../repositories/tontine-collection.repository';
import { TontineCollectionRepositoryExtensions } from '../../repositories/tontine-collection.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { TontineCollection } from '../../../models/tontine.model';
import { TontineCollectionSyncRequest, TontineCollectionSyncResponse } from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';

@Injectable({
    providedIn: 'root'
})
export class TontineCollectionSyncService extends BaseSyncService<TontineCollection, TontineCollectionRepository> {
    private failedMemberIds: string[] = [];


    constructor(
        protected override http: HttpClient,
        protected override repository: TontineCollectionRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private tontineCollectionRepositoryExtensions: TontineCollectionRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'tontine-collection');
    }

    setFailedMemberIds(ids: string[]) {
        this.failedMemberIds = ids;
    }

    /**
     * Synchronize a batch of unsynced tontine collections
     * Overridden to handle failedMemberIds dependency
     */
    override async syncBatch(limit: number = 50, failedMemberIds: string[] = []): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const unsyncedCollections = await this.fetchUnsynced(limit);

        let success = 0;
        let errors = 0;
        const failedIds: string[] = [];

        const memberIdsToCheck = failedMemberIds.length > 0 ? failedMemberIds : this.failedMemberIds;

        for (const collection of unsyncedCollections) {
            if (memberIdsToCheck.includes(collection.tontineMemberId)) {
                errors++;
                await this.syncErrorService.logSyncError(
                    'tontine-collection',
                    collection.id,
                    'SKIP',
                    new Error('Parent member failed sync'),
                    collection,
                    `Collecte Tontine ${collection.id}`,
                    collection
                );
                continue;
            }

            try {
                await this.syncSingle(collection);
                success++;
            } catch (error) {
                errors++;
                failedIds.push(collection.id);
                await this.handleError(collection.id, 'CREATE', error, collection, `Collecte Tontine ${collection.id}`);
            }
        }

        return { success, errors, failedIds };
    }

    async syncSingle(item: TontineCollection): Promise<any> {
        return this.syncSingleTontineCollection(item);
    }

    protected override async fetchUnsynced(limit: number): Promise<TontineCollection[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        const page = await this.tontineCollectionRepositoryExtensions.findByCommercialPaginated(
            commercialUsername,
            0,
            limit,
            { isSync: false, isLocal: true }
        );
        return page.content;
    }

    override async getUnsyncedCount(): Promise<number> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return 0;
        const page = await this.tontineCollectionRepositoryExtensions.findByCommercialPaginated(
            commercialUsername, 0, 1, { isSync: false, isLocal: true }
        );
        return page.totalElements;
    }

    private async syncSingleTontineCollection(collection: TontineCollection): Promise<TontineCollectionSyncResponse> {
        const serverMemberId = await this.repository.getServerId(collection.tontineMemberId, 'tontine-member');
        if (!serverMemberId) {
            throw new Error(`Impossible de trouver l'ID serveur pour le membre de tontine local ${collection.tontineMemberId}`);
        }

        const syncRequest: TontineCollectionSyncRequest = {
            memberId: parseInt(serverMemberId, 10),
            amount: collection.amount,
            isDeliveryCollection: collection.isDeliveryCollection,
            reference: collection.id,
            notes: collection.notes
        };

        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.post<ApiResponse<TontineCollectionSyncResponse>>(`${this.baseUrl}/api/v1/tontines/collections`, syncRequest, { headers })
        );

        if (!response || !response.data) {
            throw new Error(response?.message || 'Invalid response from server for tontine collection sync');
        }

        const syncedCollection = response.data;
        await this.repository.saveIdMapping(collection.id, syncedCollection.id.toString(), 'tontine-collection');
        await this.repository.markAsSynced(collection.id, syncedCollection.id.toString());

        return syncedCollection;
    }
}
