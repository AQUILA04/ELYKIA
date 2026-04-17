import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TontineDeliveryRepository } from '../../repositories/tontine-delivery.repository';
import { TontineDeliveryRepositoryExtensions } from '../../repositories/tontine-delivery.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { TontineDelivery } from '../../../models/tontine.model';
import { TontineDeliverySyncRequest, TontineDeliverySyncResponse } from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';
import { DateFilter } from '../../models/date-filter.model';

@Injectable({
    providedIn: 'root'
})
export class TontineDeliverySyncService extends BaseSyncService<TontineDelivery, TontineDeliveryRepository> {
    private failedMemberIds: string[] = [];


    constructor(
        protected override http: HttpClient,
        protected override repository: TontineDeliveryRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private readonly tontineDeliveryRepositoryExtensions: TontineDeliveryRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'tontine-delivery');
    }

    setFailedMemberIds(ids: string[]) {
        this.failedMemberIds = ids;
    }

    /**
     * Synchronize a batch of unsynced tontine deliveries
     * Overridden to handle failedMemberIds dependency
     */
    override async syncBatch(limit: number = 50, dateFilter?: DateFilter): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const unsyncedDeliveries = await this.fetchUnsynced(limit, dateFilter);

        let success = 0;
        let errors = 0;
        const failedIds: string[] = [];

        for (const delivery of unsyncedDeliveries) {
            if (this.failedMemberIds.includes(delivery.tontineMemberId)) {
                errors++;
                await this.syncErrorService.logSyncError(
                    'tontine-delivery',
                    delivery.id,
                    'SKIP',
                    new Error('Parent member failed sync'),
                    delivery,
                    `Livraison Tontine ${delivery.id}`,
                    delivery
                );
                continue;
            }

            try {
                await this.syncSingle(delivery);
                success++;
            } catch (error) {
                errors++;
                failedIds.push(delivery.id);
                await this.handleError(delivery.id, 'CREATE', error, delivery, `Livraison Tontine ${delivery.id}`);
            }
        }

        return { success, errors, failedIds };
    }

    async syncSingle(item: TontineDelivery): Promise<any> {
        return this.syncSingleTontineDelivery(item);
    }

    protected override async fetchUnsynced(limit: number, dateFilter?: DateFilter): Promise<TontineDelivery[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        const filters: any = { isSync: false, isLocal: true };

        if (dateFilter && (dateFilter.startDate || dateFilter.endDate)) {
            filters.dateFilter = {
                ...dateFilter,
                dateColumn: 'deliveryDate'
            };
        }

        const page = await this.tontineDeliveryRepositoryExtensions.findByCommercialPaginated(
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
        const page = await this.tontineDeliveryRepositoryExtensions.findByCommercialPaginated(
            commercialUsername, 0, 1, { isSync: false, isLocal: true }
        );
        return page.totalElements;
    }

    private async syncSingleTontineDelivery(delivery: TontineDelivery): Promise<TontineDeliverySyncResponse> {
        const syncRequest = await this.prepareTontineDeliverySyncRequest(delivery);
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.post<ApiResponse<TontineDeliverySyncResponse>>(`${this.baseUrl}/api/v1/tontines/deliveries/distribute`, syncRequest, { headers })
        );

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server for tontine delivery sync');
        }

        const syncedDelivery = response.data;
        await this.repository.saveIdMapping(delivery.id, syncedDelivery.id.toString(), 'tontine-delivery');
        await this.repository.markAsSynced(delivery.id, syncedDelivery.id.toString());

        return syncedDelivery;
    }

    private async prepareTontineDeliverySyncRequest(delivery: TontineDelivery): Promise<TontineDeliverySyncRequest> {
        const items = await this.repository.getItems(delivery.id);
        const serverMemberId = await this.repository.getServerId(delivery.tontineMemberId, 'tontine-member');

        if (!serverMemberId) {
            throw new Error(`Impossible de trouver l'ID serveur pour le membre de tontine local ${delivery.tontineMemberId}`);
        }

        return {
            tontineMemberId: Number.parseInt(serverMemberId, 10),
            requestDate: delivery.requestDate,
            items: items.map(item => ({
                articleId: Number.parseInt(item.articleId, 10),
                quantity: item.quantity,
                unitPrice: item.unitPrice
            }))
        };
    }
}
