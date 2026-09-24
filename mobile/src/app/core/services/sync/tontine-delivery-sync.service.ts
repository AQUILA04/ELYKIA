import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TontineDeliveryRepository } from '../../repositories/tontine-delivery.repository';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { TontineDelivery, TontineDeliveryItem } from '../../../models/tontine.model';
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
        protected override syncErrorService: SyncErrorService
    ) {
        super(http, repository, authService, syncErrorService, 'tontine-delivery');
    }

    private syncConsentCode: string | undefined;

    setFailedMemberIds(ids: string[]) {
        this.failedMemberIds = ids;
    }

    setSyncConsentCode(code: string) {
        this.syncConsentCode = code;
    }

    override async syncBatch(limit: number = 50, dateFilter?: DateFilter): Promise<{ success: number; errors: number; failedIds: string[] }> {
        await this.repository.purgeSyncedOrphans();
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

    /**
     * Crée une commande (PENDING) ou une livraison directe (DELIVERED) sur le serveur.
     */
    async postCreateDelivery(
        delivery: TontineDelivery,
        items: TontineDeliveryItem[]
    ): Promise<TontineDeliverySyncResponse> {
        const syncRequest = await this.prepareTontineDeliverySyncRequest(delivery, items);
        const headers = this.getAuthHeaders();
        const isOrder = delivery.status === 'PENDING' || delivery.status === 'VALIDATED';
        const endpoint = isOrder
            ? `${this.baseUrl}/api/v1/tontines/deliveries`
            : `${this.baseUrl}/api/v1/tontines/deliveries/distribute`;

        const response = await firstValueFrom(
            this.http.post<ApiResponse<TontineDeliverySyncResponse>>(endpoint, syncRequest, { headers })
        );

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server for tontine delivery sync');
        }

        return this.normalizeSyncResponse(response.data);
    }

    /**
     * Marque une commande déjà créée sur le serveur comme livrée.
     */
    async postMarkDelivered(serverDeliveryId: string): Promise<TontineDeliverySyncResponse> {
        const headers = this.getAuthHeaders();
        const response = await firstValueFrom(
            this.http.patch<ApiResponse<TontineDeliverySyncResponse>>(
                `${this.baseUrl}/api/v1/tontines/deliveries/${serverDeliveryId}/deliver`,
                {},
                { headers }
            )
        );

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server for tontine delivery mark-delivered');
        }

        return this.normalizeSyncResponse(response.data);
    }

    protected override async fetchUnsynced(limit: number, dateFilter?: DateFilter): Promise<TontineDelivery[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        const unsynced = await this.repository.findUnsynced(commercialUsername, limit, 0);

        if (!dateFilter || (!dateFilter.startDate && !dateFilter.endDate)) {
            return unsynced;
        }

        return unsynced.filter(delivery => {
            const dateValue = delivery.deliveryDate || delivery.requestDate;
            if (!dateValue) return true;
            const day = dateValue.substring(0, 10);
            if (dateFilter.startDate && day < dateFilter.startDate) return false;
            if (dateFilter.endDate && day > dateFilter.endDate) return false;
            return true;
        });
    }

    override async getUnsyncedCount(): Promise<number> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return 0;
        const all = await this.repository.findUnsynced(commercialUsername, 500, 0);
        return all.length;
    }

    private async syncSingleTontineDelivery(delivery: TontineDelivery): Promise<TontineDeliverySyncResponse> {
        if (delivery.needsDeliverSync) {
            const serverId = await this.resolveServerDeliveryId(delivery);
            if (!serverId) {
                throw new Error(`Impossible de trouver l'ID serveur pour la livraison tontine ${delivery.id}`);
            }
            const synced = await this.postMarkDelivered(serverId);
            await this.repository.markDeliverSynced(delivery.id);
            return synced;
        }

        const items = delivery.items || await this.repository.getItems(delivery.id);
        const syncedDelivery = await this.postCreateDelivery(delivery, items);
        await this.repository.saveIdMapping(delivery.id, syncedDelivery.id.toString(), 'tontine-delivery');
        await this.repository.markAsSynced(delivery.id, syncedDelivery.id.toString());
        return syncedDelivery;
    }

    private async resolveServerDeliveryId(delivery: TontineDelivery): Promise<string | null> {
        if (/^\d+$/.test(delivery.id)) {
            return delivery.id;
        }
        return this.repository.getServerId(delivery.id, 'tontine-delivery');
    }

    private normalizeSyncResponse(data: any): TontineDeliverySyncResponse {
        return {
            id: data.id,
            tontineMemberId: data.tontineMemberId,
            reference: data.reference,
            totalAmount: data.totalAmount,
            status: data.status || data.deliveryStatus,
            requestDate: data.requestDate,
            deliveryDate: data.deliveryDate,
            deliveryStatus: data.deliveryStatus || data.status
        };
    }

    private async prepareTontineDeliverySyncRequest(
        delivery: TontineDelivery,
        items?: TontineDeliveryItem[]
    ): Promise<TontineDeliverySyncRequest> {
        const deliveryItems = items ?? await this.repository.getItems(delivery.id);
        let serverMemberId = await this.repository.getServerId(delivery.tontineMemberId, 'tontine-member');
        if (!serverMemberId && /^\d+$/.test(delivery.tontineMemberId)) {
            serverMemberId = delivery.tontineMemberId;
        }

        if (!serverMemberId) {
            throw new Error(`Impossible de trouver l'ID serveur pour le membre de tontine local ${delivery.tontineMemberId}`);
        }

        return {
            tontineMemberId: Number.parseInt(serverMemberId, 10),
            reference: delivery.reference ?? null,
            requestDate: delivery.requestDate,
            items: deliveryItems.map(item => ({
                articleId: Number.parseInt(item.articleId, 10),
                quantity: item.quantity,
                unitPrice: item.unitPrice
            })),
            operationConsentCode: delivery.operationConsentCode ?? null,
            syncConsentCode: this.syncConsentCode ?? null
        };
    }
}
