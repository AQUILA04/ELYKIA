import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrderRepository } from '../../repositories/order.repository';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { Order } from '../../../models/order.model';
import { OrderItem } from '../../../models/order-item.model';
import { OrderSyncRequest, OrderSyncResponse } from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';
import { DateFilter } from '../../models/date-filter.model';
import { OrderStatusValue, getOrderStatusTransitionPath } from '../../utils/order-status.util';

@Injectable({
    providedIn: 'root'
})
export class OrderSyncService extends BaseSyncService<Order, OrderRepository> {
    private failedClientIds: string[] = [];


    constructor(
        protected override http: HttpClient,
        protected override repository: OrderRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService
    ) {
        super(http, repository, authService, syncErrorService, 'order');
    }

    private syncConsentCode: string | undefined;

    setFailedClientIds(ids: string[]) {
        this.failedClientIds = ids;
    }

    setSyncConsentCode(code: string) {
        this.syncConsentCode = code;
    }

    /**
     * Synchronize a batch of unsynced orders (creates + pending status updates)
     */
    override async syncBatch(limit: number = 20, dateFilter?: DateFilter): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const unsyncedOrders = await this.fetchUnsynced(limit, dateFilter);

        let success = 0;
        let errors = 0;
        const failedIds: string[] = [];

        for (const order of unsyncedOrders) {
            if (order.isLocal && this.failedClientIds.includes(order.clientId)) {
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
                const operation = order.isLocal ? 'CREATE' : 'UPDATE';
                await this.handleError(order.id, operation, error, order, `Commande ${order.reference || order.id}`);
            }
        }

        return { success, errors, failedIds };
    }

    async syncSingle(item: Order): Promise<any> {
        return this.syncSingleOrder(item);
    }

    private async syncSingleOrder(order: Order): Promise<OrderSyncResponse | void> {
        const existingServerId = await this.repository.getServerId(order.id, 'order');
        // Already created on server (or numeric server id): push status only
        if (existingServerId || !order.isLocal) {
            await this.syncStatusOnly(order);
            return;
        }
        return this.syncLocalCreateThenStatus(order);
    }

    /**
     * Crée une commande sur le serveur sans modifier SQLite (online-first).
     */
    async postCreateOrder(order: Order, items: OrderItem[]): Promise<OrderSyncResponse> {
        const syncRequest = await this.prepareOrderSyncRequestFromItems(order, items);
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.post<ApiResponse<OrderSyncResponse>>(`${this.baseUrl}/api/v1/orders`, syncRequest, { headers })
        );

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server for order sync');
        }

        return response.data;
    }

    /**
     * PATCH order status on the server (online-first status change).
     */
    async postUpdateOrderStatus(serverOrderIds: string[], newStatus: OrderStatusValue): Promise<void> {
        const headers = this.getAuthHeaders();
        const body = {
            orderIds: serverOrderIds.map(id => Number.parseInt(id, 10)),
            newStatus
        };
        const response = await firstValueFrom(
            this.http.patch<ApiResponse<unknown>>(`${this.baseUrl}/api/v1/orders/status`, body, { headers })
        );
        if (response && response.status === 'error') {
            throw new Error(response.message || 'Échec de la mise à jour du statut de commande');
        }
    }

    protected override async fetchUnsynced(limit: number, dateFilter?: DateFilter): Promise<Order[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        return this.repository.findUnsyncedIncludingStatusUpdates(commercialUsername, limit, 0);
    }

    private async syncLocalCreateThenStatus(order: Order): Promise<OrderSyncResponse> {
        const syncRequest = await this.prepareOrderSyncRequest(order);
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.post<ApiResponse<OrderSyncResponse>>(`${this.baseUrl}/api/v1/orders`, syncRequest, { headers })
        );

        if (!response?.data) {
            throw new Error(response?.message || 'Invalid response from server for order sync');
        }

        const syncedOrder = response.data;
        const serverId = syncedOrder.id.toString();

        await this.repository.saveIdMapping(order.id, serverId, 'order');
        await this.repository.updateStatusFields(order.id, {
            status: order.status,
            isSync: order.status === 'PENDING',
            isLocal: false
        });

        // Push non-PENDING status after create (server always creates as PENDING)
        if (order.status && order.status !== 'PENDING') {
            const path = getOrderStatusTransitionPath('PENDING', order.status);
            for (const step of path) {
                await this.postUpdateOrderStatus([serverId], step);
            }
            await this.repository.updateStatusFields(order.id, {
                status: order.status,
                isSync: true,
                isLocal: false
            });
        }

        return syncedOrder;
    }

    private async syncStatusOnly(order: Order): Promise<void> {
        const serverId = await this.repository.getServerId(order.id, 'order');
        if (!serverId) {
            throw new Error(`Impossible de trouver l'ID serveur pour la commande ${order.id}`);
        }

        // Server may still be PENDING while local advanced through ACCEPTED/SOLD/CANCEL…
        // We cannot know server status offline; try direct then fallback via PENDING path.
        try {
            await this.postUpdateOrderStatus([serverId], order.status as OrderStatusValue);
        } catch {
            const path = getOrderStatusTransitionPath('PENDING', order.status);
            for (const step of path) {
                await this.postUpdateOrderStatus([serverId], step);
            }
        }

        await this.repository.updateSyncStatus(order.id, true);
    }

    private async prepareOrderSyncRequest(order: Order): Promise<OrderSyncRequest> {
        const items = await this.repository.getItemsForOrder(order.id);
        return this.prepareOrderSyncRequestFromItems(order, items);
    }

    private async prepareOrderSyncRequestFromItems(order: Order, items: OrderItem[]): Promise<OrderSyncRequest> {
        const clientServerId = await this.repository.getServerId(order.clientId, 'client');

        if (!clientServerId) {
            throw new Error(`Impossible de trouver l'ID serveur pour le client local ${order.clientId}`);
        }

        return {
            clientId: Number.parseInt(clientServerId, 10),
            items: items.map(item => ({
                articleId: Number.parseInt(item.articleId, 10),
                quantity: item.quantity
            })),
            operationConsentCode: order.operationConsentCode ?? null,
            confirmedAmount: order.confirmedAmount ?? null,
            syncConsentCode: this.syncConsentCode ?? null
        };
    }
}
