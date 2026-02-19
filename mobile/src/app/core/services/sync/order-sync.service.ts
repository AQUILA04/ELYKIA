import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrderRepository } from '../../repositories/order.repository';
import { OrderRepositoryExtensions } from '../../repositories/order.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { Order } from '../../../models/order.model';
import { OrderSyncRequest, OrderSyncResponse } from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';

@Injectable({
    providedIn: 'root'
})
export class OrderSyncService extends BaseSyncService<Order, OrderRepository> {
    private failedClientIds: string[] = [];


    constructor(
        protected override http: HttpClient,
        protected override repository: OrderRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private orderRepositoryExtensions: OrderRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'order');
    }

    setFailedClientIds(ids: string[]) {
        this.failedClientIds = ids;
    }

    /**
     * Synchronize a batch of unsynced orders
     * Overridden to handle failedClientIds dependency
     */
    override async syncBatch(limit: number = 20, failedClientIds: string[] = []): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const unsyncedOrders = await this.fetchUnsynced(limit);

        let success = 0;
        let errors = 0;
        const failedIds: string[] = [];

        const clientIdsToCheck = failedClientIds.length > 0 ? failedClientIds : this.failedClientIds;

        for (const order of unsyncedOrders) {
            if (clientIdsToCheck.includes(order.clientId)) {
                // Check if client is actually synced (failedClientIds contains local IDs)
                errors++;
                await this.syncErrorService.logSyncError(
                    'order',
                    order.id,
                    'SKIP',
                    new Error('Parent client failed sync'),
                    order,
                    `Commande ${order.reference || order.id}`,
                    order
                );
                continue;
            }

            try {
                await this.syncSingle(order);
                success++;
            } catch (error) {
                errors++;
                failedIds.push(order.id);
                await this.handleError(order.id, 'CREATE', error, order, `Commande ${order.reference || order.id}`);
            }
        }

        return { success, errors, failedIds };
    }

    async syncSingle(item: Order): Promise<any> {
        return this.syncSingleOrder(item);
    }

    protected override async fetchUnsynced(limit: number): Promise<Order[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        const page = await this.orderRepositoryExtensions.findByCommercialPaginated(
            commercialUsername,
            0,
            limit,
            { isSync: false }
        );
        return page.content;
    }

    private async syncSingleOrder(order: Order): Promise<OrderSyncResponse> {
        const syncRequest = await this.prepareOrderSyncRequest(order);
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.post<ApiResponse<OrderSyncResponse>>(`${this.baseUrl}/api/v1/orders`, syncRequest, { headers })
        );

        if (!response || !response.data) {
            throw new Error(response?.message || 'Invalid response from server for order sync');
        }

        const syncedOrder = response.data;

        await this.repository.saveIdMapping(order.id, syncedOrder.id.toString(), 'order');
        await this.repository.updateSyncStatus(order.id, true);

        return syncedOrder;
    }

    private async prepareOrderSyncRequest(order: Order): Promise<OrderSyncRequest> {
        const items = await this.repository.getItemsForOrder(order.id);
        const clientServerId = await this.repository.getServerId(order.clientId, 'client');

        if (!clientServerId) {
            throw new Error(`Impossible de trouver l'ID serveur pour le client local ${order.clientId}`);
        }

        return {
            clientId: parseInt(clientServerId, 10),
            items: items.map(item => ({
                articleId: parseInt(item.articleId, 10),
                quantity: item.quantity
            }))
        };
    }
}
