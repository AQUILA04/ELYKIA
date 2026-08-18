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
import { DateFilter } from '../../models/date-filter.model';

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
        private readonly tontineCollectionRepositoryExtensions: TontineCollectionRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'tontine-collection');
    }

    private syncConsentCode: string | undefined;

    setFailedMemberIds(ids: string[]) {
        this.failedMemberIds = ids;
    }

    setSyncConsentCode(code: string) {
        this.syncConsentCode = code;
    }

    /**
     * Synchronize a batch of unsynced tontine collections
     * Overridden to handle failedMemberIds dependency
     */
    override async syncBatch(limit: number = 50, dateFilter?: DateFilter): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const unsyncedCollections = await this.fetchUnsynced(limit, dateFilter);

        let success = 0;
        let errors = 0;
        const failedIds: string[] = [];

        for (const collection of unsyncedCollections) {
            if (this.failedMemberIds.includes(collection.tontineMemberId)) {
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

    /**
     * Crée une collecte tontine sur le serveur sans modifier SQLite (online-first).
     */
    async postCreateCollection(collection: TontineCollection): Promise<TontineCollectionSyncResponse> {
        const syncRequest = await this.prepareTontineCollectionSyncRequest(collection);
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.post<ApiResponse<TontineCollectionSyncResponse>>(`${this.baseUrl}/api/v1/tontines/collections`, syncRequest, { headers })
        );

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server for tontine collection sync');
        }

        return response.data;
    }

    protected override async fetchUnsynced(limit: number, dateFilter?: DateFilter): Promise<TontineCollection[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        const filters: any = { isSync: false, isLocal: true };

        if (dateFilter && (dateFilter.startDate || dateFilter.endDate)) {
            filters.dateFilter = {
                ...dateFilter,
                dateColumn: 'collectionDate'
            };
        }

        const page = await this.tontineCollectionRepositoryExtensions.findByCommercialPaginated(
            commercialUsername,
            0,
            limit,
            filters
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
        const syncedCollection = await this.postCreateCollection(collection);
        await this.repository.saveIdMapping(collection.id, syncedCollection.id.toString(), 'tontine-collection');
        const persisted: TontineCollection = {
            ...collection,
            id: syncedCollection.id.toString(),
            isLocal: false,
            isSync: true,
            syncDate: new Date().toISOString(),
            societyShareAmount: syncedCollection.societyShareAmount ?? collection.societyShareAmount ?? 0,
            contributionMonth: syncedCollection.contributionMonth || collection.contributionMonth,
            advanceToNextMonth: syncedCollection.advanceToNextMonth === true
        };
        await this.repository.saveAll([persisted], false);
        return syncedCollection;
    }

    private async prepareTontineCollectionSyncRequest(collection: TontineCollection): Promise<TontineCollectionSyncRequest> {
        const serverMemberId = await this.repository.getServerId(collection.tontineMemberId, 'tontine-member');
        if (!serverMemberId) {
            throw new Error(`Impossible de trouver l'ID serveur pour le membre de tontine local ${collection.tontineMemberId}`);
        }

        return {
            memberId: Number.parseInt(serverMemberId, 10),
            amount: collection.amount,
            isDeliveryCollection: collection.isDeliveryCollection,
            reference: collection.id,
            notes: collection.notes,
            operationConsentCode: collection.operationConsentCode ?? null,
            confirmedAmount: collection.confirmedAmount ?? null,
            syncConsentCode: this.syncConsentCode ?? null,
            collectionDate: toCatchupCollectionDate(collection.collectionDate),
            advanceToNextMonth: collection.advanceToNextMonth === true
        };
    }
}

/** Envoie collectionDate seulement pour un rattrapage (date locale strictement avant aujourd'hui). */
export function toCatchupCollectionDate(raw?: string | null): string | undefined {
    if (!raw) {
        return undefined;
    }
    const dateStr = String(raw).substring(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return undefined;
    }
    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');
    return dateStr < today ? dateStr : undefined;
}
